from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from database import get_db
from utils.jwt import get_current_user_id
from schemas import UserOut

router = APIRouter()

@router.get("/me", response_model=UserOut)
async def get_me(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found")
    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"], created_at=user["created_at"])