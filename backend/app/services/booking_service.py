"""
Unified booking pipeline for all org types.
"""
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException

from app.services.allocation_service import (
    get_available_resources, find_best_fit, check_slot_conflict, compute_fairness_score
)
from app.services.conflict_service import resolve_conflict, upgrade_waitlist
from app.services.notification_service import send_notification

STAFF_AUTO_APPROVE_ORGS = {
    "college": ["staff"],
    "hospital": ["doctor"],
}

# Roles that skip admin approval AND the waitlist — they get a room
# immediately, or a clear error if none can be assigned.
ADMIN_ROLES = ("admin", "warden", "manager")


def _is_auto_approve_role(role: str, org_type: str) -> bool:
    if role in ADMIN_ROLES:
        return True
    return role in STAFF_AUTO_APPROVE_ORGS.get(org_type, [])


def _reject_past_slot(booking_data: dict) -> None:
    """Reject bookings whose start time is already in the past."""
    date_str = booking_data.get("date")
    start = (booking_data.get("time_slot") or {}).get("start")
    if not date_str or not start:
        raise HTTPException(400, "Booking date and start time are required.")

    try:
        slot_start = datetime.strptime(f"{date_str} {start}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(400, "Invalid date or time format (expected YYYY-MM-DD and HH:MM).")

    if slot_start <= datetime.utcnow():
        raise HTTPException(
            400,
            "Cannot book for a past time slot. Please pick a future date or time.",
        )


async def create_booking(user: dict, booking_data: dict, db) -> dict:
    org_type = user["org_type"]
    role = user["role"]
    org_id = user["org_id"]

    _reject_past_slot(booking_data)

    filters = {
        "resource_type": booking_data.get("resource_type"),
        "min_capacity": booking_data.get("required_capacity", 1),
        "facilities": booking_data.get("required_facilities", []),
        "block": booking_data.get("block"),
        "date": booking_data.get("date"),
        "time_start": booking_data.get("time_slot", {}).get("start"),
        "time_end": booking_data.get("time_slot", {}).get("end"),
        "department": booking_data.get("department"),
    }

    auto_approve = _is_auto_approve_role(role, org_type)

    available = await get_available_resources(org_id, org_type, filters, db)
    if not available:
        if auto_approve:
            raise HTTPException(
                409,
                "No rooms match your criteria for the selected time. "
                "Try a different slot, lower the capacity, or relax facility filters.",
            )
        return await _create_waitlisted_booking(user, booking_data, db)

    best_room = await find_best_fit(available, booking_data.get("required_capacity", 1))
    if not best_room:
        if auto_approve:
            raise HTTPException(
                409,
                f"No room has capacity ≥ {booking_data.get('required_capacity', 1)} "
                f"available in this slot.",
            )
        return await _create_waitlisted_booking(user, booking_data, db)

    # Check for time-slot conflicts on that specific room. Because
    # get_available_resources already filters out clashes, a remaining conflict
    # is a race or a pending-waitlist entry — auto-approve roles just pick the
    # next best-fit room instead of queuing.
    conflict = await check_slot_conflict(
        best_room["_id"],
        booking_data["date"],
        booking_data["time_slot"]["start"],
        booking_data["time_slot"]["end"],
        db,
    )

    if conflict:
        if auto_approve:
            remaining = [r for r in available if r["_id"] != best_room["_id"]]
            best_room = await find_best_fit(
                remaining, booking_data.get("required_capacity", 1)
            )
            if not best_room:
                raise HTTPException(
                    409,
                    "All matching rooms are already booked for this slot.",
                )
        else:
            resolution = await resolve_conflict(
                {**booking_data, "user_role": role, "org_id": org_id, "org_type": org_type},
                conflict,
                db,
            )
            if resolution["resolution"] == "protected":
                raise HTTPException(409, f"Booking conflict: {resolution['message']}")
            if resolution["resolution"] == "reject_new":
                # Equal/lower priority: park on the waitlist tied to THIS resource so
                # auto-upgrade can promote them if the winner cancels.
                return await _create_waitlisted_booking(
                    user, booking_data, db, resource_id=best_room["_id"]
                )
            # override successful — proceed to book the room

    initial_status = "approved" if auto_approve else "pending"

    fairness = await compute_fairness_score(str(user["_id"]), db)

    now = datetime.utcnow()
    doc = {
        "org_id": ObjectId(str(org_id)),
        "resource_id": best_room["_id"],
        "user_id": user["_id"],
        "user_role": role,
        "org_type": org_type,
        "purpose": booking_data.get("purpose", ""),
        "priority": booking_data.get("priority", "medium"),
        "status": initial_status,
        "justification": booking_data.get("justification", ""),
        "date": booking_data["date"],
        "time_slot": booking_data["time_slot"],
        "required_capacity": booking_data.get("required_capacity", 1),
        "required_facilities": booking_data.get("required_facilities", []),
        "nlp_parsed": booking_data.get("nlp_parsed", False),
        "nlp_raw_text": booking_data.get("nlp_raw_text"),
        "admin_approved": initial_status == "approved",
        "approved_by": user["_id"] if initial_status == "approved" else None,
        "approved_at": now if initial_status == "approved" else None,
        "waitlist_position": None,
        "check_in_time": None,
        "fairness_score": fairness,
        "bundle_id": None,
        "bundle_resources": booking_data.get("bundle_resources", []),
        "created_at": now,
        "updated_at": now,
    }

    result = await db.bookings.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Notification
    msg_map = {
        "approved": f"Your booking for {best_room.get('room_id')} on {booking_data['date']} has been approved.",
        "pending": f"Your booking request for {booking_data['date']} is pending admin approval.",
    }
    await send_notification(user["_id"], msg_map.get(initial_status, "Booking created."), initial_status, db, booking_id=result.inserted_id)

    return doc


async def _create_waitlisted_booking(user: dict, booking_data: dict, db, resource_id=None) -> dict:
    org_id = user["org_id"]
    # Count existing waitlist entries for same slot/resource — preserves FIFO order.
    waitlist_query = {
        "org_id": ObjectId(str(org_id)),
        "date": booking_data["date"],
        "status": "pending",
        "waitlist_position": {"$gte": 1},
    }
    if resource_id is not None:
        waitlist_query["resource_id"] = resource_id
    waitlist_count = await db.bookings.count_documents(waitlist_query)
    now = datetime.utcnow()
    doc = {
        "org_id": ObjectId(str(org_id)),
        "resource_id": ObjectId(str(resource_id)) if resource_id is not None else None,
        "user_id": user["_id"],
        "user_role": user["role"],
        "org_type": user["org_type"],
        "purpose": booking_data.get("purpose", ""),
        "priority": booking_data.get("priority", "medium"),
        "status": "pending",
        "justification": booking_data.get("justification", ""),
        "date": booking_data["date"],
        "time_slot": booking_data.get("time_slot", {}),
        "required_capacity": booking_data.get("required_capacity", 1),
        "required_facilities": booking_data.get("required_facilities", []),
        "nlp_parsed": booking_data.get("nlp_parsed", False),
        "nlp_raw_text": booking_data.get("nlp_raw_text"),
        "admin_approved": False,
        "approved_by": None,
        "approved_at": None,
        "waitlist_position": waitlist_count + 1,
        "check_in_time": None,
        "fairness_score": 0.0,
        "bundle_id": None,
        "bundle_resources": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.bookings.insert_one(doc)
    doc["_id"] = result.inserted_id
    await send_notification(
        user["_id"],
        f"No rooms available. You have been added to waitlist position {doc['waitlist_position']}.",
        "waitlist",
        db,
        booking_id=result.inserted_id,
    )
    return doc


async def admin_action_booking(booking_id: str, action: str, admin: dict, db, reason: str = None, new_resource_id: str = None) -> dict:
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(404, "Booking not found")

    update = {"updated_at": datetime.utcnow()}

    if action == "approve":
        update["status"] = "approved"
        update["admin_approved"] = True
        update["approved_by"] = admin["_id"]
        update["approved_at"] = datetime.utcnow()
        msg = "Your booking has been approved by admin."
        notif_type = "approval"

    elif action == "reject":
        update["status"] = "rejected"
        msg = f"Your booking was rejected. Reason: {reason or 'Not specified'}"
        notif_type = "rejection"
        # Trigger waitlist upgrade
        if booking.get("resource_id"):
            await upgrade_waitlist(booking["resource_id"], booking["date"], booking["time_slot"], db)

    elif action == "reassign":
        if not new_resource_id:
            raise HTTPException(400, "new_resource_id required for reassign action")
        resource = await db.resources.find_one({"_id": ObjectId(new_resource_id)})
        if not resource:
            raise HTTPException(404, "New resource not found")
        update["status"] = "reassigned"
        update["resource_id"] = ObjectId(new_resource_id)
        update["reassigned_from"] = booking.get("resource_id")
        msg = f"Your booking has been reassigned to room {resource.get('room_id')}."
        notif_type = "reassignment"

    elif action == "checkin":
        update["status"] = "checked_in"
        update["check_in_time"] = datetime.utcnow()
        msg = "Check-in confirmed for your booking."
        notif_type = "checkin"
    else:
        raise HTTPException(400, f"Unknown action: {action}")

    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": update})
    await send_notification(booking["user_id"], msg, notif_type, db, booking_id=ObjectId(booking_id))

    return await db.bookings.find_one({"_id": ObjectId(booking_id)})


async def cancel_booking(booking_id: str, user: dict, db) -> dict:
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(404, "Booking not found")
    if str(booking["user_id"]) != str(user["_id"]) and user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Not authorized to cancel this booking")

    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}},
    )

    if booking.get("resource_id"):
        await upgrade_waitlist(booking["resource_id"], booking["date"], booking["time_slot"], db)

    await send_notification(booking["user_id"], "Your booking has been cancelled.", "cancellation", db, booking_id=ObjectId(booking_id))
    return await db.bookings.find_one({"_id": ObjectId(booking_id)})


async def mark_no_show(booking_id: str, db):
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "no_show", "updated_at": datetime.utcnow()}},
    )
    # Penalize reputation
    await db.users.update_one(
        {"_id": booking["user_id"]},
        {"$inc": {"no_show_count": 1}, "$set": {"reputation_score": None}},
    )
    user = await db.users.find_one({"_id": booking["user_id"]})
    if user:
        total = user.get("no_show_count", 0) + 1
        new_score = max(0.0, 5.0 - (total * 0.5))
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"reputation_score": new_score}})
