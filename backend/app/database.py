from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    await create_indexes()


async def close_db():
    if client:
        client.close()


async def get_db():
    return db


async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index([("org_id", 1), ("role", 1)])
    await db.organizations.create_index([("type", 1), ("admin_id", 1)])
    await db.resources.create_index([("org_id", 1), ("is_available", 1)])
    await db.resources.create_index([("org_id", 1), ("resource_type", 1)])
    await db.bookings.create_index([("resource_id", 1), ("date", 1), ("status", 1)])
    await db.bookings.create_index([("user_id", 1), ("status", 1)])
    await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
    await db.exam_sessions.create_index([("org_id", 1), ("date", 1)])
