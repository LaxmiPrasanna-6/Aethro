"""
MongoDB collection: users
Supports all org types: college, hostel, lodge, hospital
"""
from enum import Enum

ORG_TYPES = ["college", "hostel", "lodge", "hospital"]

ROLE_MAP = {
    "college": ["admin", "staff", "student"],
    "hostel": ["warden"],
    "lodge": ["manager"],
    "hospital": ["admin", "reception", "doctor"],
}

PRIORITY_LEVELS = ["low", "medium", "high"]
BOOKING_STATUSES = ["pending", "approved", "rejected", "cancelled", "reassigned", "checked_in", "no_show"]

# MongoDB document shape (reference)
USER_SCHEMA = {
    "_id": "ObjectId",
    "username": "str",
    "email": "str (unique)",
    "password_hash": "str",
    "phone": "str",
    "org_type": "college|hostel|lodge|hospital",
    "role": "admin|staff|student|warden|manager|reception|doctor",
    "org_id": "ObjectId (ref: organizations)",
    "department": "str (college only)",
    "club": "str (college student only)",
    "is_authorized": "bool",
    "reputation_score": "float (0.0 - 5.0, hospital feature)",
    "no_show_count": "int",
    "fairness_score": "float",
    "is_active": "bool",
    "created_at": "datetime",
}
