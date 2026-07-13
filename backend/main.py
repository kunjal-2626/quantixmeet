from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, disconnect_db
from routes import auth, users, bookings, calendars

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()

app = FastAPI(title="QuantixMeet API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["bookings"])
app.include_router(calendars.router, prefix="/api/calendars", tags=["calendars"])

@app.get("/")
async def root():
    return {"message": "QuantixMeet API is running"}
