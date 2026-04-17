"""
MongoDB collection: bookings
Unified booking model across all org types.
"""

BOOKING_SCHEMA = {
    "_id": "ObjectId",
    "org_id": "ObjectId",
    "resource_id": "ObjectId",
    "user_id": "ObjectId",
    "user_role": "str",
    "org_type": "college|hostel|lodge|hospital",

    "purpose": "str",
    "priority": "low|medium|high",
    "status": "pending|approved|rejected|cancelled|reassigned|checked_in|no_show",
    "justification": "str",

    "date": "date",
    "time_slot": {"start": "HH:MM", "end": "HH:MM"},

    "required_capacity": "int",
    "required_facilities": ["str"],

    "nlp_parsed": "bool",
    "nlp_raw_text": "str",

    "admin_approved": "bool",
    "approved_by": "ObjectId",
    "approved_at": "datetime",

    "override_info": {
        "overridden_booking_id": "ObjectId",
        "reason": "str",
    },
    "reassigned_from": "ObjectId",
    "waitlist_position": "int",

    "check_in_time": "datetime",
    "fairness_score": "float",

    # Multi-resource bundle (hospital)
    "bundle_id": "ObjectId",
    "bundle_resources": ["ObjectId"],

    "created_at": "datetime",
    "updated_at": "datetime",
}
