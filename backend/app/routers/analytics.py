from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.services.allocation_service import predict_demand
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get("/dashboard", summary="Admin analytics dashboard")
async def dashboard(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Admin only")

    org_id = ObjectId(str(current_user["org_id"]))

    total_resources = await db.resources.count_documents({"org_id": org_id})
    available_resources = await db.resources.count_documents({"org_id": org_id, "is_available": True})

    total_bookings = await db.bookings.count_documents({"org_id": org_id})
    pending = await db.bookings.count_documents({"org_id": org_id, "status": "pending"})
    approved = await db.bookings.count_documents({"org_id": org_id, "status": "approved"})
    rejected = await db.bookings.count_documents({"org_id": org_id, "status": "rejected"})
    cancelled = await db.bookings.count_documents({"org_id": org_id, "status": "cancelled"})
    no_shows = await db.bookings.count_documents({"org_id": org_id, "status": "no_show"})

    total_users = await db.users.count_documents({"org_id": org_id})
    authorized_users = await db.users.count_documents({"org_id": org_id, "is_authorized": True})

    return {
        "resources": {
            "total": total_resources,
            "available": available_resources,
            "occupied": total_resources - available_resources,
        },
        "bookings": {
            "total": total_bookings,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "cancelled": cancelled,
            "no_shows": no_shows,
        },
        "users": {
            "total": total_users,
            "authorized": authorized_users,
        },
    }


@router.get("/booking-trends", summary="Booking count by date (last 30 days)")
async def booking_trends(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Admin only")
    org_id = ObjectId(str(current_user["org_id"]))
    cursor = db.bookings.find(
        {"org_id": org_id, "status": {"$in": ["approved", "checked_in"]}},
        {"date": 1}
    ).limit(500)
    bookings = await cursor.to_list(500)
    trend = {}
    for b in bookings:
        d = b.get("date", "")
        trend[d] = trend.get(d, 0) + 1
    return {"trends": [{"date": k, "count": v} for k, v in sorted(trend.items())]}


@router.get("/room-usage", summary="Per-room usage statistics")
async def room_usage(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Admin only")
    org_id = ObjectId(str(current_user["org_id"]))
    cursor = db.bookings.find(
        {"org_id": org_id, "status": {"$in": ["approved", "checked_in"]}},
        {"resource_id": 1}
    ).limit(1000)
    bookings = await cursor.to_list(1000)
    usage: dict = {}
    for b in bookings:
        rid = str(b.get("resource_id", "unknown"))
        usage[rid] = usage.get(rid, 0) + 1
    sorted_usage = sorted(usage.items(), key=lambda x: x[1], reverse=True)
    return {"usage": [{"resource_id": k, "booking_count": v} for k, v in sorted_usage[:20]]}


@router.get("/demand-forecast", summary="Demand forecast by day of week")
async def demand(
    resource_type: str = Query("classroom"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user["role"] not in ("admin", "warden", "manager", "doctor"):
        raise HTTPException(403, "Admin only")
    return await predict_demand(str(current_user["org_id"]), resource_type, db)


@router.get("/priority-breakdown", summary="Booking count by priority")
async def priority_breakdown(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Admin only")
    org_id = ObjectId(str(current_user["org_id"]))
    result = {}
    for priority in ("low", "medium", "high"):
        result[priority] = await db.bookings.count_documents({"org_id": org_id, "priority": priority})
    return result
