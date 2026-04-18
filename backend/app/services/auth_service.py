from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status

from app.database import get_db
from app.utils.security import hash_password, verify_password, create_access_token
from app.models.user import ROLE_MAP, ORG_TYPES

SINGLE_AUTHORITY_ROLES = {
    "college": "admin",
    "hostel": "warden",
    "lodge": "manager",
    "hospital": "admin",
}


async def register_user(data: dict, db) -> dict:
    org_type = data["org_type"]
    role = data["role"]

    if org_type not in ORG_TYPES:
        raise HTTPException(400, f"Invalid org_type. Allowed: {ORG_TYPES}")
    if role not in ROLE_MAP.get(org_type, []):
        raise HTTPException(400, f"Role '{role}' not valid for '{org_type}'. Allowed: {ROLE_MAP[org_type]}")

    if await db.users.find_one({"email": data["email"]}):
        raise HTTPException(409, "Email already registered")
    if await db.users.find_one({"username": data["username"]}):
        raise HTTPException(409, "Username already taken")

    # Enforce single authority (admin/warden/manager) per org
    authority_role = SINGLE_AUTHORITY_ROLES.get(org_type)
    org_name = data.get("org_name", "")

    org_doc = None
    if org_name:
        org_doc = await db.organizations.find_one({"name": org_name, "type": org_type})

    if role == authority_role:
        if org_doc and org_doc.get("admin_id"):
            raise HTTPException(409, f"Organization already has a {authority_role}. Only one allowed per organization.")
        if not org_doc:
            # Create organization
            org_doc = {
                "name": org_name or data["username"] + "'s Org",
                "type": org_type,
                "address": "",
                "admin_id": None,
                "created_at": datetime.utcnow(),
            }
            result = await db.organizations.insert_one(org_doc)
            org_doc["_id"] = result.inserted_id

    # Students / staff must belong to an existing org
    if role != authority_role and not org_doc:
        raise HTTPException(400, "Organization not found. Please provide a valid org_name.")

    # College: enforce one authorized login per department
    if org_type == "college" and role == "staff" and data.get("department"):
        existing_staff = await db.users.find_one({
            "org_id": org_doc["_id"],
            "role": "staff",
            "department": data["department"],
            "is_authorized": True,
        })
        if existing_staff:
            raise HTTPException(409, f"Department '{data['department']}' already has an authorized staff login.")

    user_doc = {
        "username": data["username"],
        "email": data["email"],
        "password_hash": hash_password(data["password"]),
        "phone": data["phone"],
        "org_type": org_type,
        "role": role,
        "org_id": org_doc["_id"],
        "department": data.get("department"),
        "club": data.get("club"),
        "specialization": data.get("specialization") if org_type == "hospital" and role == "doctor" else None,
        "availability_status": "available" if org_type == "hospital" and role == "doctor" else None,
        "is_authorized": role == authority_role,
        "reputation_score": 5.0,
        "no_show_count": 0,
        "fairness_score": 0.0,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Link admin_id to org
    if role == authority_role:
        await db.organizations.update_one(
            {"_id": org_doc["_id"]},
            {"$set": {"admin_id": result.inserted_id}},
        )

    return user_doc


async def login_user(email: str, password: str, db) -> dict:
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")

    # Non-authority roles need explicit authorization
    authority_role = SINGLE_AUTHORITY_ROLES.get(user["org_type"])
    if user["role"] != authority_role and not user.get("is_authorized", False):
        raise HTTPException(status_code=403, detail="Account not yet authorized. Please contact your organization admin.")

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"], "org_type": user["org_type"]})
    return {"access_token": token, "token_type": "bearer", "user": user}


async def get_org_users(org_id: str, db) -> list:
    cursor = db.users.find({"org_id": ObjectId(org_id)})
    return await cursor.to_list(length=200)


async def authorize_user(user_id: str, authorized: bool, db) -> dict:
    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_authorized": authorized}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "User not found")
    return result
