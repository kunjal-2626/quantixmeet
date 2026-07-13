from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import httpx

from database import get_db
from schemas import BookingCreate, BookingOut, BookingStatus
from utils.jwt import get_current_user_id
from config import settings

router = APIRouter()

def _out(b):
    return BookingOut(id=str(b["_id"]), title=b["title"], date=b["date"], start_time=b["start_time"], end_time=b["end_time"], invitee_name=b["invitee_name"], invitee_email=b["invitee_email"], meeting_link=b["meeting_link"], notes=b.get("notes"), status=b["status"], created_at=b["created_at"])

async def check_availability(cals: list, date: str, start_time: str, end_time: str) -> dict:
    conflicts = []
    for cal in cals:
        try:
            if cal["provider"] == "google":
                time_min = f"{date}T{start_time}:00+05:30"
                time_max = f"{date}T{end_time}:00+05:30"
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                        headers={"Authorization": f"Bearer {cal['access_token']}"},
                        params={"timeMin": time_min, "timeMax": time_max, "singleEvents": True},
                    )
                data = resp.json()
                print(f"Google availability response: {resp.status_code} {data}")
                for event in data.get("items", []):
                    conflicts.append({
                        "calendar": "Google Calendar",
                        "title": event.get("summary", "Busy"),
                        "start": event.get("start", {}).get("dateTime", ""),
                        "end": event.get("end", {}).get("dateTime", ""),
                    })
            elif cal["provider"] == "outlook":
                time_min = f"{date}T{start_time}:00"
                time_max = f"{date}T{end_time}:00"
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://graph.microsoft.com/v1.0/me/calendarView",
                        headers={"Authorization": f"Bearer {cal['access_token']}"},
                        params={"startDateTime": time_min, "endDateTime": time_max},
                    )
                data = resp.json()
                print(f"Outlook availability response: {resp.status_code} {data}")
                for event in data.get("value", []):
                    conflicts.append({
                        "calendar": "Outlook Calendar",
                        "title": event.get("subject", "Busy"),
                        "start": event.get("start", {}).get("dateTime", ""),
                        "end": event.get("end", {}).get("dateTime", ""),
                    })
        except Exception as e:
            print(f"Availability check error: {e}")
    return {"available": len(conflicts) == 0, "conflicts": conflicts}

async def create_google_event(cal: dict, booking: dict):
    event_body = {
        "summary": booking["title"],
        "description": booking.get("notes", ""),
        "start": {"dateTime": f"{booking['date']}T{booking['start_time']}:00", "timeZone": "Asia/Kolkata"},
        "end":   {"dateTime": f"{booking['date']}T{booking['end_time']}:00", "timeZone": "Asia/Kolkata"},
        "attendees": [{"email": booking["invitee_email"]}],
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            json=event_body,
            headers={"Authorization": f"Bearer {cal['access_token']}"},
        )
    data = resp.json()
    return data.get("hangoutLink", ""), data.get("id", "")

async def delete_google_event(cal: dict, external_event_id: str):
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{external_event_id}",
            headers={"Authorization": f"Bearer {cal['access_token']}"},
        )

async def create_outlook_event(cal: dict, booking: dict):
    event_body = {
        "subject": booking["title"],
        "body": {"contentType": "Text", "content": booking.get("notes", "")},
        "start": {"dateTime": f"{booking['date']}T{booking['start_time']}:00", "timeZone": "Asia/Kolkata"},
        "end":   {"dateTime": f"{booking['date']}T{booking['end_time']}:00", "timeZone": "Asia/Kolkata"},
        "attendees": [{"emailAddress": {"address": booking["invitee_email"], "name": booking["invitee_name"]}, "type": "required"}],
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://graph.microsoft.com/v1.0/me/events",
            json=event_body,
            headers={"Authorization": f"Bearer {cal['access_token']}"},
        )
    print(f"Outlook response: {resp.status_code} {resp.text}")
    data = resp.json()
    meet_link = data.get("onlineMeeting", {}).get("joinUrl", "")
    event_id = data.get("id", "")
    return meet_link, event_id

async def delete_outlook_event(cal: dict, external_event_id: str):
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"https://graph.microsoft.com/v1.0/me/events/{external_event_id}",
            headers={"Authorization": f"Bearer {cal['access_token']}"},
        )

@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(data: BookingCreate, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    if data.start_time >= data.end_time:
        raise HTTPException(400, "End time must be after start time")
    booking = {
        "user_id": ObjectId(user_id),
        "title": data.title,
        "date": data.date,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "invitee_name": data.invitee_name,
        "invitee_email": data.invitee_email,
        "notes": data.notes,
        "status": BookingStatus.upcoming,
        "meeting_link": "",
        "external_event_ids": {},
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.bookings.insert_one(booking)
    booking["_id"] = result.inserted_id
    booking["meeting_link"] = f"{settings.FRONTEND_URL}/meet/{result.inserted_id}"

    cals = await db.connected_calendars.find({"user_id": ObjectId(user_id)}).to_list(10)
    for cal in cals:
        try:
            if cal["provider"] == "google":
                meet_link, ext_id = await create_google_event(cal, booking)
                if meet_link:
                    booking["meeting_link"] = meet_link
                booking["external_event_ids"]["google"] = ext_id
            elif cal["provider"] == "outlook":
                meet_link, ext_id = await create_outlook_event(cal, booking)
                if meet_link:
                    booking["meeting_link"] = meet_link
                booking["external_event_ids"]["outlook"] = ext_id
        except Exception as e:
            print(f"Calendar sync error: {e}")

    await db.bookings.update_one(
        {"_id": result.inserted_id},
        {"$set": {"meeting_link": booking["meeting_link"], "external_event_ids": booking["external_event_ids"]}}
    )
    return _out(booking)

@router.get("", response_model=list[BookingOut])
async def list_bookings(status: Optional[str] = Query(None), search: Optional[str] = Query(None), user_id: str = Depends(get_current_user_id)):
    db = get_db()
    query = {"user_id": ObjectId(user_id)}
    if status and status != "all":
        query["status"] = status
    if search:
        query["$or"] = [{"title": {"$regex": search, "$options": "i"}}, {"invitee_name": {"$regex": search, "$options": "i"}}]
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.bookings.update_many({"user_id": ObjectId(user_id), "date": {"$lt": now_date}, "status": BookingStatus.upcoming}, {"$set": {"status": BookingStatus.past}})
    bookings = await db.bookings.find(query).sort("date", 1).to_list(100)
    return [_out(b) for b in bookings]

@router.get("/availability")
async def check_slot_availability(
    date: str = Query(...),
    start_time: str = Query(...),
    end_time: str = Query(...),
    user_id: str = Depends(get_current_user_id)
):
    db = get_db()
    cals = await db.connected_calendars.find({"user_id": ObjectId(user_id)}).to_list(10)
    if not cals:
        return {"available": True, "conflicts": [], "message": "No calendars connected"}
    result = await check_availability(cals, date, start_time, end_time)
    return result

@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    b = await db.bookings.find_one({"_id": ObjectId(booking_id), "user_id": ObjectId(user_id)})
    if not b:
        raise HTTPException(404, "Booking not found")
    return _out(b)

@router.delete("/{booking_id}")
async def delete_booking(booking_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    b = await db.bookings.find_one({"_id": ObjectId(booking_id), "user_id": ObjectId(user_id)})
    if not b:
        raise HTTPException(404, "Booking not found")
    ext_ids = b.get("external_event_ids", {})
    cals = await db.connected_calendars.find({"user_id": ObjectId(user_id)}).to_list(10)
    for cal in cals:
        try:
            if cal["provider"] == "google" and ext_ids.get("google"):
                await delete_google_event(cal, ext_ids["google"])
            elif cal["provider"] == "outlook" and ext_ids.get("outlook"):
                await delete_outlook_event(cal, ext_ids["outlook"])
        except Exception as e:
            print(f"Calendar delete error: {e}")
    await db.bookings.delete_one({"_id": ObjectId(booking_id)})
    return {"message": "Booking cancelled successfully"}