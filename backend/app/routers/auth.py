from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.schemas.user import RegisterRequest, TokenResponse, UserResponse, UserUpdate
from app.services.auth_service import register_user, login_user, get_org_users, authorize_user
from app.utils.dependencies import get_current_user, serialize_doc, serialize_list, require_roles

router = APIRouter()


def _user_response(doc: dict) -> dict:
    doc = serialize_doc(doc)
    doc.pop("password_hash", None)
    return doc


@router.post("/register", summary="Register a new user")
async def register(data: RegisterRequest, db=Depends(get_db)):
    user = await register_user(data.model_dump(), db)
    return {"message": "Registration successful", "user": _user_response(user)}


@router.post("/login", summary="Login and get JWT token")
async def login(data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    result = await login_user(data.username, data.password, db)
    result["user"] = _user_response(result["user"])
    return result


@router.get("/me", summary="Get current user profile")
async def get_me(current_user=Depends(get_current_user)):
    return _user_response(dict(current_user))


@router.get("/org/users", summary="Get all users in the same organization")
async def org_users(current_user=Depends(get_current_user), db=Depends(get_db)):
    users = await get_org_users(str(current_user["org_id"]), db)
    return serialize_list([dict(u) for u in users])


@router.patch("/users/{user_id}/authorize", summary="Authorize or deactivate a user (admin only)")
async def authorize(user_id: str, authorized: bool, current_user=Depends(get_current_user), db=Depends(get_db)):
    if current_user["role"] not in ("admin", "warden", "manager"):
        raise HTTPException(403, "Only admins can authorize users")
    user = await authorize_user(user_id, authorized, db)
    return _user_response(dict(user))


@router.patch("/me/update", summary="Update current user profile")
async def update_me(data: UserUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.users.find_one_and_update(
        {"_id": current_user["_id"]},
        {"$set": update_data},
        return_document=True,
    )
    return _user_response(dict(result))
