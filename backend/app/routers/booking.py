from fastapi import APIRouter, Depends, Query
from bson import ObjectId

from app.database import get_db
from app.schemas.booking import BookingCreate, BookingAction, NLPBookingRequest
from app.services.booking_service import create_booking, admin_action_booking, cancel_booking, mark_no_show
from app.services.nlp_service import parse_nlp_booking
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list

router = APIRouter()


def _fmt(doc):
    d = serialize_doc(dict(doc))
    if d.get("resource_id"):
        d["resource_id"] = str(d["resource_id"]) if not isinstance(d["resource_id"], str) else d["resource_id"]
    return d


async def _attach_room_labels(bookings: list[dict], db) -> list[dict]:
    """Attach human-readable room_id / block to each booking via a batch lookup."""
    resource_ids = {
        ObjectId(b["resource_id"]) for b in bookings
        if b.get("resource_id")
    }
    if not resource_ids:
        return bookings
    rooms = await db.resources.find(
        {"_id": {"$in": list(resource_ids)}},
        {"room_id": 1, "block": 1, "resource_type": 1},
    ).to_list(length=len(resource_ids))
    by_id = {str(r["_id"]): r for r in rooms}
    for b in bookings:
        rid = b.get("resource_id")
        if rid and str(rid) in by_id:
            r = by_id[str(rid)]
            b["room_id"] = r.get("room_id")
            b["block"] = r.get("block")
            b["resource_type"] = r.get("resource_type")
    return bookings


@router.post("/", summary="Create a booking (standard form)")
async def book(data: BookingCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    booking = await create_booking(current_user, data.model_dump(), db)
    return _fmt(booking)


@router.post("/nlp", summary="Natural language booking request")
async def book_nlp(data: NLPBookingRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    parsed = parse_nlp_booking(data.raw_text)
    booking = await create_booking(current_user, parsed, db)
    return {"parsed_request": parsed, "booking": _fmt(booking)}


@router.get("/my", summary="Get current user's bookings")
async def my_bookings(
    status: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = {"user_id": current_user["_id"]}
    if status:
        query["status"] = status
    cursor = db.bookings.find(query).sort("created_at", -1).limit(100)
    bookings = await cursor.to_list(length=100)
    return await _attach_room_labels(serialize_list([dict(b) for b in bookings]), db)


@router.get("/org", summary="Get all bookings for the org (admin/warden/manager)")
async def org_bookings(
    status: str = Query(None),
    date: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user["role"] not in ("admin", "warden", "manager", "doctor", "reception"):
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
    query = {"org_id": ObjectId(str(current_user["org_id"]))}
    if status:
        query["status"] = status
    if date:
        query["date"] = date
    cursor = db.bookings.find(query).sort("created_at", -1).limit(500)
    bookings = await cursor.to_list(length=500)
    return await _attach_room_labels(serialize_list([dict(b) for b in bookings]), db)


@router.get("/pending", summary="Get pending bookings (admin approval queue)")
async def pending_bookings(current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
    query = {"org_id": ObjectId(str(current_user["org_id"])), "status": "pending"}
    cursor = db.bookings.find(query).sort("created_at", 1)
    bookings = await cursor.to_list(length=200)
    return await _attach_room_labels(serialize_list([dict(b) for b in bookings]), db)


@router.patch("/{booking_id}/action", summary="Admin action on a booking")
async def booking_action(
    booking_id: str,
    action: BookingAction,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user["role"] not in ("admin", "warden", "manager", "doctor"):
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
    booking = await admin_action_booking(
        booking_id, action.action, current_user, db,
        reason=action.reason, new_resource_id=action.new_resource_id
    )
    return _fmt(booking)


@router.delete("/{booking_id}", summary="Cancel a booking")
async def cancel(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    booking = await cancel_booking(booking_id, current_user, db)
    return _fmt(booking)


@router.patch("/{booking_id}/no-show", summary="Mark booking as no-show (admin)")
async def no_show(booking_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager", "doctor"):
        from fastapi import HTTPException
        raise HTTPException(403, "Access denied")
    await mark_no_show(booking_id, db)
    return {"message": "Marked as no-show"}


@router.get("/notifications", summary="Get user notifications")
async def notifications(
    unread_only: bool = Query(False),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    from app.services.notification_service import get_user_notifications
    notifs = await get_user_notifications(str(current_user["_id"]), db, unread_only)
    return serialize_list([dict(n) for n in notifs])


@router.patch("/notifications/{notif_id}/read")
async def mark_notif_read(notif_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    from app.services.notification_service import mark_read
    await mark_read(notif_id, db)
    return {"message": "Marked as read"}


@router.patch("/notifications/read-all")
async def mark_all_notifs_read(current_user=Depends(get_current_user), db=Depends(get_db)):
    from app.services.notification_service import mark_all_read
    await mark_all_read(str(current_user["_id"]), db)
    return {"message": "All notifications marked as read"}
