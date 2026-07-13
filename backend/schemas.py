from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

class CalendarProvider(str, Enum):
    google = "google"
    outlook = "outlook"

class CalendarOut(BaseModel):
    id: str
    provider: CalendarProvider
    calendar_email: str
    connected_at: datetime

class BookingStatus(str, Enum):
    upcoming = "upcoming"
    past = "past"
    cancelled = "cancelled"

class BookingCreate(BaseModel):
    title: str = Field(..., min_length=2)
    date: str
    start_time: str
    end_time: str
    invitee_name: str
    invitee_email: EmailStr
    notes: Optional[str] = None

class BookingOut(BaseModel):
    id: str
    title: str
    date: str
    start_time: str
    end_time: str
    invitee_name: str
    invitee_email: str
    meeting_link: str
    notes: Optional[str]
    status: BookingStatus
    created_at: datetime