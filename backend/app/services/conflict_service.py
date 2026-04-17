"""
Priority-driven conflict resolution engine.

Rules:
1. Higher priority overrides lower.
2. Equal priority → first-come-first-served (reject new) unless admin decides.
3. Admin-approved HIGH priority student bookings are PROTECTED:
   they cannot be overridden by ANY lower-priority booking.
4. When overriding: try to reassign the displaced booking first;
   if no alternate room found → reject with notification.
"""
from bson import ObjectId
from datetime import datetime

from app.services.allocation_service import (
    PRIORITY_WEIGHT,
    find_best_fit,
    get_available_resources,
    check_slot_conflict,
)
from app.services.notification_service import send_notification


async def resolve_conflict(new_booking: dict, existing_booking: dict, db) -> dict:
    new_p = PRIORITY_WEIGHT.get(new_booking.get("priority", "low"), 1)
    ex_p = PRIORITY_WEIGHT.get(existing_booking.get("priority", "low"), 1)

    # PROTECTED: admin-approved HIGH priority student booking
    if (
        existing_booking.get("user_role") == "student"
        and existing_booking.get("priority") == "high"
        and existing_booking.get("admin_approved", False)
        and new_p <= ex_p
    ):
        return {
            "resolution": "protected",
            "message": "Cannot override admin-approved high-priority student booking.",
        }

    if new_p > ex_p:
        # New booking may override existing
        reassigned = await attempt_reassignment(existing_booking, db)
        if reassigned:
            await db.bookings.update_one(
                {"_id": existing_booking["_id"]},
                {"$set": {
                    "status": "reassigned",
                    "resource_id": reassigned["_id"],
                    "reassigned_from": existing_booking["resource_id"],
                    "updated_at": datetime.utcnow(),
                }},
            )
            await send_notification(
                existing_booking["user_id"],
                f"Your booking has been reassigned to room {reassigned.get('room_id')} due to a higher-priority booking.",
                "reassignment",
                db,
                booking_id=existing_booking["_id"],
            )
            return {"resolution": "override_reassigned", "message": "Existing booking reassigned to alternate room."}
        else:
            await db.bookings.update_one(
                {"_id": existing_booking["_id"]},
                {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}},
            )
            await send_notification(
                existing_booking["user_id"],
                "Your booking was rejected due to a higher-priority booking and no alternate room was available.",
                "rejection",
                db,
                booking_id=existing_booking["_id"],
            )
            return {"resolution": "override_rejected", "message": "Existing booking rejected (no alternate available)."}

    elif new_p == ex_p:
        # First-come-first-served: reject the new one
        return {
            "resolution": "reject_new",
            "message": "Equal priority conflict. First-come-first-served: existing booking takes precedence.",
        }
    else:
        # new_p < ex_p: new booking has lower priority
        return {
            "resolution": "reject_new",
            "message": "New booking has lower priority than existing booking.",
        }


async def attempt_reassignment(booking: dict, db) -> dict | None:
    """Try to find an alternative room for a displaced booking."""
    filters = {
        "resource_type": None,  # any same type
        "min_capacity": booking.get("required_capacity", 1),
        "facilities": booking.get("required_facilities", []),
        "date": booking.get("date"),
        "time_start": booking.get("time_slot", {}).get("start"),
        "time_end": booking.get("time_slot", {}).get("end"),
    }
    # Get the current resource to know its type
    current_resource = await db.resources.find_one({"_id": ObjectId(str(booking["resource_id"]))})
    if current_resource:
        filters["resource_type"] = current_resource.get("resource_type")

    available = await get_available_resources(booking["org_id"], booking["org_type"], filters, db)
    # Exclude the current resource
    available = [r for r in available if r["_id"] != booking["resource_id"]]

    from app.services.allocation_service import find_best_fit
    return await find_best_fit(available, booking.get("required_capacity", 1))


async def upgrade_waitlist(resource_id, date_str: str, time_slot: dict, db):
    """When a booking is cancelled, upgrade the first waitlisted booking."""
    waitlisted = await db.bookings.find_one(
        {
            "resource_id": ObjectId(str(resource_id)),
            "date": date_str,
            "time_slot.start": time_slot.get("start"),
            "time_slot.end": time_slot.get("end"),
            "status": "pending",
            "waitlist_position": {"$gte": 1},
        },
        sort=[("waitlist_position", 1)],
    )
    if waitlisted:
        await db.bookings.update_one(
            {"_id": waitlisted["_id"]},
            {"$set": {"status": "approved", "waitlist_position": None, "updated_at": datetime.utcnow()}},
        )
        await send_notification(
            waitlisted["user_id"],
            "Your waitlisted booking has been automatically upgraded to approved!",
            "approval",
            db,
            booking_id=waitlisted["_id"],
        )
        return waitlisted
    return None
