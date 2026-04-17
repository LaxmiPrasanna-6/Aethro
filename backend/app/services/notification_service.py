from datetime import datetime
from bson import ObjectId


async def send_notification(user_id, message: str, notif_type: str, db, booking_id=None):
    doc = {
        "user_id": ObjectId(str(user_id)),
        "message": message,
        "type": notif_type,
        "booking_id": ObjectId(str(booking_id)) if booking_id else None,
        "is_read": False,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(doc)


async def get_user_notifications(user_id: str, db, unread_only: bool = False) -> list:
    query = {"user_id": ObjectId(user_id)}
    if unread_only:
        query["is_read"] = False
    cursor = db.notifications.find(query).sort("created_at", -1).limit(50)
    return await cursor.to_list(length=50)


async def mark_read(notification_id: str, db):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}},
    )


async def mark_all_read(user_id: str, db):
    await db.notifications.update_many(
        {"user_id": ObjectId(user_id), "is_read": False},
        {"$set": {"is_read": True}},
    )
