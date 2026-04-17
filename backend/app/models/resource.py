"""
MongoDB collection: resources

ONE physical collection, but FOUR distinct logical schemas selected by
`org_type`. Each org type stores only the fields that make sense for it.

All documents share these common fields:

    _id:               ObjectId
    org_id:            ObjectId
    org_type:          "college" | "hostel" | "lodge" | "hospital"
    room_id:           str           (unique within an org)
    capacity:          int
    is_available:      bool
    current_occupancy: int
    created_at:        datetime


─── COLLEGE_ROOM_SCHEMA ────────────────────────────────────────────────────
Admin uploads a blueprint .docx that describes rooms by block.

    block:          str                 e.g. "A", "B"
    resource_type:  "classroom" | "lab" | "seminar_hall"
    facilities:     list[str]           projector, ac, whiteboard, ...


─── HOSTEL_ROOM_SCHEMA ─────────────────────────────────────────────────────
Warden uploads a blueprint .docx describing each hostel room.

    resource_type:  "room"              (always)
    floor:          int                 0 = ground floor
    room_type:      "ac" | "non_ac"
    sharing_type:   int (1–6)           beds per room
    features:       list[str]           WiFi, Attached Bath, ...


─── LODGE_ROOM_SCHEMA ──────────────────────────────────────────────────────
Manager uploads a blueprint .docx describing each lodge room.

    resource_type:  "room"              (always)
    floor:          int
    room_type:      "ac" | "non_ac"
    sharing_type:   int (1–6)
    food_option:    bool
    features:       list[str]           WiFi, TV, Kitchen, ...


─── HOSPITAL_RESOURCE_SCHEMA ───────────────────────────────────────────────
Admin uploads a blueprint .docx describing each hospital resource.

    resource_type:  "ward" | "icu" | "ot" | "consultation" | "bed"
    department:     str                 Cardiology, Orthopaedics, ...
    floor:          int
    facilities:     list[str]           monitors, ventilator, x_ray, ...
"""

COMMON_FIELDS = {
    "_id": "ObjectId",
    "org_id": "ObjectId",
    "org_type": "college|hostel|lodge|hospital",
    "room_id": "str",
    "capacity": "int",
    "is_available": "bool",
    "current_occupancy": "int",
    "created_at": "datetime",
}

COLLEGE_ROOM_SCHEMA = {
    **COMMON_FIELDS,
    "block": "str",
    "resource_type": "classroom|lab|seminar_hall",
    "facilities": "list[str]",
}

HOSTEL_ROOM_SCHEMA = {
    **COMMON_FIELDS,
    "resource_type": "room",
    "floor": "int",
    "room_type": "ac|non_ac",
    "sharing_type": "int",
    "features": "list[str]",
}

LODGE_ROOM_SCHEMA = {
    **COMMON_FIELDS,
    "resource_type": "room",
    "floor": "int",
    "room_type": "ac|non_ac",
    "sharing_type": "int",
    "food_option": "bool",
    "features": "list[str]",
}

HOSPITAL_RESOURCE_SCHEMA = {
    **COMMON_FIELDS,
    "resource_type": "ward|icu|ot|consultation|bed",
    "department": "str",
    "floor": "int",
    "facilities": "list[str]",
}

RESOURCE_SCHEMAS_BY_ORG_TYPE = {
    "college": COLLEGE_ROOM_SCHEMA,
    "hostel": HOSTEL_ROOM_SCHEMA,
    "lodge": LODGE_ROOM_SCHEMA,
    "hospital": HOSPITAL_RESOURCE_SCHEMA,
}
