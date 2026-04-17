"""
Core resource allocation logic.
Best-fit: minimize capacity wastage.
"""
from bson import ObjectId
from datetime import datetime


PRIORITY_WEIGHT = {"low": 1, "medium": 2, "high": 3}


def _now_parts():
    now = datetime.utcnow()
    return now.strftime("%Y-%m-%d"), now.strftime("%H:%M")


async def get_available_resources(org_id, org_type: str, filters: dict, db) -> list:
    query = {
        "org_id": ObjectId(str(org_id)),
        "org_type": org_type,
        "is_available": True,
    }

    if filters.get("resource_type"):
        query["resource_type"] = filters["resource_type"]
    if filters.get("min_capacity"):
        query["capacity"] = {"$gte": int(filters["min_capacity"])}
    if filters.get("block"):
        query["block"] = filters["block"]
    if filters.get("room_type"):
        query["room_type"] = filters["room_type"]
    if filters.get("sharing_type"):
        query["sharing_type"] = int(filters["sharing_type"])
    if filters.get("food_option") is not None:
        query["food_option"] = filters["food_option"]
    if filters.get("department"):
        query["department"] = filters["department"]

    required_facilities = filters.get("facilities") or []
    if required_facilities:
        query["facilities"] = {"$all": required_facilities}

    required_features = filters.get("features") or []
    if required_features:
        query["features"] = {"$all": required_features}

    resources = await db.resources.find(query).to_list(length=200)

    # Exclude rooms already booked in the requested time slot
    date_str = filters.get("date")
    time_start = filters.get("time_start")
    time_end = filters.get("time_end")
    if date_str and time_start and time_end:
        booked_ids = await get_conflicting_resource_ids(
            org_id, date_str, time_start, time_end, db
        )
        resources = [r for r in resources if r["_id"] not in booked_ids]

    return resources


async def find_best_fit(resources: list, required_capacity: int) -> dict | None:
    eligible = [r for r in resources if r["capacity"] >= required_capacity]
    if not eligible:
        return None
    # Minimize wastage
    return min(eligible, key=lambda r: r["capacity"] - required_capacity)


async def get_conflicting_resource_ids(org_id, date_str: str, start: str, end: str, db) -> set:
    """
    Return set of resource ObjectIds that have ACTIVE approved/pending bookings
    overlapping the requested slot. Bookings whose end_time is already in the
    past (for today) are considered completed and do not block the room.
    """
    today, now_hhmm = _now_parts()

    query = {
        "org_id": ObjectId(str(org_id)),
        "date": date_str,
        "status": {"$in": ["approved", "pending", "checked_in"]},
        "time_slot.start": {"$lt": end},
        "time_slot.end": {"$gt": start},
    }
    # For today's date, ignore bookings that have already ended
    if date_str == today:
        query["time_slot.end"] = {"$gt": max(start, now_hhmm)}

    cursor = db.bookings.find(query)
    bookings = await cursor.to_list(length=500)
    return {b["resource_id"] for b in bookings if b.get("resource_id")}


async def check_slot_conflict(resource_id, date_str: str, start: str, end: str, db):
    """
    Returns a conflicting booking document or None.
    Completed bookings (end time in the past for today) are ignored.
    """
    today, now_hhmm = _now_parts()

    query = {
        "resource_id": ObjectId(str(resource_id)),
        "date": date_str,
        "status": {"$in": ["approved", "pending", "checked_in"]},
        "time_slot.start": {"$lt": end},
        "time_slot.end": {"$gt": start},
    }
    if date_str == today:
        query["time_slot.end"] = {"$gt": max(start, now_hhmm)}

    return await db.bookings.find_one(query)


async def compute_fairness_score(user_id, db) -> float:
    total = await db.bookings.count_documents({"user_id": ObjectId(str(user_id))})
    approved = await db.bookings.count_documents({"user_id": ObjectId(str(user_id)), "status": "approved"})
    if total == 0:
        return 1.0
    return round(approved / total, 2)


async def predict_demand(org_id, resource_type: str, db) -> dict:
    """Simple demand prediction: count bookings per day-of-week for a resource type."""
    cursor = db.bookings.find({
        "org_id": ObjectId(str(org_id)),
        "status": {"$in": ["approved", "checked_in"]},
    })
    bookings = await cursor.to_list(length=1000)

    day_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    for b in bookings:
        try:
            d = datetime.strptime(b["date"], "%Y-%m-%d")
            day_counts[d.weekday()] += 1
        except (ValueError, KeyError):
            pass

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return {days[k]: v for k, v in day_counts.items()}
