from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.database import get_db
from app.utils.security import decode_token
from bson import ObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise credentials_exception
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


def require_roles(*roles):
    async def checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"Access denied. Required roles: {list(roles)}")
        return current_user
    return checker


def require_org_type(*org_types):
    async def checker(current_user=Depends(get_current_user)):
        if current_user["org_type"] not in org_types:
            raise HTTPException(status_code=403, detail=f"Access denied for organization type: {current_user['org_type']}")
        return current_user
    return checker


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for key, val in doc.items():
        if isinstance(val, ObjectId):
            doc[key] = str(val)
    return doc


def serialize_list(docs: list) -> list:
    return [serialize_doc(d) for d in docs if d]
