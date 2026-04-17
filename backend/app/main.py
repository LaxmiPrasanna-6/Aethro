from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_db, close_db
from app.routers import auth, college, hostel, lodge, hospital, booking, exam, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="Smart Resource Allocation System",
    description="Manages booking and allocation for Colleges, Hostels, Lodges, and Hospitals",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(college.router, prefix="/api/college", tags=["College"])
app.include_router(hostel.router, prefix="/api/hostel", tags=["Hostel"])
app.include_router(lodge.router, prefix="/api/lodge", tags=["Lodge"])
app.include_router(hospital.router, prefix="/api/hospital", tags=["Hospital"])
app.include_router(booking.router, prefix="/api/booking", tags=["Booking"])
app.include_router(exam.router, prefix="/api/exam", tags=["Examination"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
async def root():
    return {"message": "Smart Resource Allocation System API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
