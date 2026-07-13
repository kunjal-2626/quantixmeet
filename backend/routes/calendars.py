from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import get_db
from utils.jwt import get_current_user_id
from schemas import CalendarOut

router = APIRouter()

@router.get("", response_model=list[CalendarOut])
async def list_calendars(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    cals = await db.connected_calendars.find({"user_id": ObjectId(user_id)}).to_list(10)
    return [CalendarOut(id=str(c["_id"]), provider=c["provider"], calendar_email=c["calendar_email"], connected_at=c["connected_at"]) for c in cals]

@router.delete("/{cal_id}")
async def disconnect_calendar(cal_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = await db.connected_calendars.delete_one({"_id": ObjectId(cal_id), "user_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Calendar not found")
    return {"message": "Calendar disconnected"}