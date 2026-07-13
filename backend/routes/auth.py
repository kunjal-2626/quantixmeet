from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from bson import ObjectId
import httpx, urllib.parse, bcrypt

from database import get_db
from schemas import UserRegister, UserLogin, TokenResponse, RefreshRequest
from utils.jwt import create_access_token, create_refresh_token, decode_token, get_current_user_id
from config import settings

router = APIRouter()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

@router.post("/register", status_code=201)
async def register(data: UserRegister):
    db = get_db()
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email already registered")
    user = {"name": data.name, "email": data.email, "password_hash": hash_password(data.password), "created_at": datetime.now(timezone.utc)}
    result = await db.users.insert_one(user)
    return {"message": "Registration successful", "id": str(result.inserted_id)}

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    uid = str(user["_id"])
    return TokenResponse(access_token=create_access_token(uid), refresh_token=create_refresh_token(uid))

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest):
    user_id = decode_token(data.refresh_token, "refresh")
    return TokenResponse(access_token=create_access_token(user_id), refresh_token=create_refresh_token(user_id))

@router.get("/google/connect")
async def google_connect(token: str):
    from utils.jwt import decode_token
    user_id = decode_token(token, "access")
    params = {"client_id": settings.GOOGLE_CLIENT_ID, "redirect_uri": settings.GOOGLE_REDIRECT_URI, "response_type": "code", "scope": "https://www.googleapis.com/auth/calendar openid email profile", "access_type": "offline", "prompt": "consent", "state": user_id}
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params))

@router.get("/google/callback")
async def google_callback(code: str, state: str):
    db = get_db()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={"code": code, "client_id": settings.GOOGLE_CLIENT_ID, "client_secret": settings.GOOGLE_CLIENT_SECRET, "redirect_uri": settings.GOOGLE_REDIRECT_URI, "grant_type": "authorization_code"})
    tokens = token_resp.json()
    if "error" in tokens:
        raise HTTPException(400, tokens.get("error_description", "Google OAuth failed"))
    async with httpx.AsyncClient() as client:
        profile = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    profile_data = profile.json()
    await db.connected_calendars.update_one({"user_id": ObjectId(state), "provider": "google"}, {"$set": {"user_id": ObjectId(state), "provider": "google", "access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token", ""), "calendar_email": profile_data.get("email", ""), "connected_at": datetime.now(timezone.utc)}}, upsert=True)
    return RedirectResponse(f"{settings.FRONTEND_URL}/settings?connected=google")

@router.get("/outlook/connect")
async def outlook_connect(token: str):
    from utils.jwt import decode_token
    user_id = decode_token(token, "access")
    params = {"client_id": settings.OUTLOOK_CLIENT_ID, "redirect_uri": settings.OUTLOOK_REDIRECT_URI, "response_type": "code", "scope": "Calendars.ReadWrite User.Read offline_access", "state": user_id}
    return RedirectResponse(f"https://login.microsoftonline.com/{settings.OUTLOOK_TENANT_ID}/oauth2/v2.0/authorize?" + urllib.parse.urlencode(params))


@router.get("/outlook/callback")
async def outlook_callback(code: str = None, state: str = None, error: str = None, error_description: str = None):
    if error:
        return RedirectResponse(f"{settings.FRONTEND_URL}/settings?error={error}")
    if not code:
        raise HTTPException(400, "No authorization code received")
    db = get_db()
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            f"https://login.microsoftonline.com/{settings.OUTLOOK_TENANT_ID}/oauth2/v2.0/token",
            data={"code": code, "client_id": settings.OUTLOOK_CLIENT_ID, "client_secret": settings.OUTLOOK_CLIENT_SECRET, "redirect_uri": settings.OUTLOOK_REDIRECT_URI, "grant_type": "authorization_code"},
        )
    tokens = token_resp.json()
    if "error" in tokens:
        raise HTTPException(400, tokens.get("error_description", "Outlook OAuth failed"))
    async with httpx.AsyncClient() as client:
        profile = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
    profile_data = profile.json()
    await db.connected_calendars.update_one(
        {"user_id": ObjectId(state), "provider": "outlook"},
        {"$set": {"user_id": ObjectId(state), "provider": "outlook", "access_token": tokens.get("access_token"), "refresh_token": tokens.get("refresh_token", ""), "calendar_email": profile_data.get("mail") or profile_data.get("userPrincipalName", ""), "connected_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return RedirectResponse(f"{settings.FRONTEND_URL}/settings?connected=outlook")