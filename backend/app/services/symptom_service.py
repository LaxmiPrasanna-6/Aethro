"""
Symptom → Specialization mapping and doctor auto-assignment for hospital module.
"""
from typing import Optional

SYMPTOM_SPECIALIZATION_MAP = {
    "chest pain": "cardiology", "heart": "cardiology", "palpitation": "cardiology", "cardiac": "cardiology",
    "shortness of breath": "pulmonology", "cough": "pulmonology", "breathing": "pulmonology",
    "asthma": "pulmonology", "lung": "pulmonology", "tuberculosis": "pulmonology",
    "fever": "general medicine", "cold": "general medicine", "flu": "general medicine",
    "weakness": "general medicine", "fatigue": "general medicine",
    "headache": "neurology", "migraine": "neurology", "seizure": "neurology",
    "paralysis": "neurology", "stroke": "neurology", "dizziness": "neurology", "nerve": "neurology",
    "bone": "orthopedics", "fracture": "orthopedics", "joint pain": "orthopedics",
    "back pain": "orthopedics", "spine": "orthopedics", "muscle pain": "orthopedics",
    "stomach": "gastroenterology", "abdomen": "gastroenterology", "vomit": "gastroenterology",
    "nausea": "gastroenterology", "diarrhea": "gastroenterology", "liver": "gastroenterology",
    "skin": "dermatology", "rash": "dermatology", "acne": "dermatology", "eczema": "dermatology",
    "eye": "ophthalmology", "vision": "ophthalmology", "blindness": "ophthalmology",
    "ear": "ent", "throat": "ent", "nose": "ent", "hearing": "ent", "tonsil": "ent",
    "kidney": "nephrology", "urine": "nephrology", "dialysis": "nephrology",
    "diabetes": "endocrinology", "thyroid": "endocrinology", "hormone": "endocrinology",
    "cancer": "oncology", "tumor": "oncology",
    "mental": "psychiatry", "anxiety": "psychiatry", "depression": "psychiatry",
    "child": "pediatrics", "infant": "pediatrics", "newborn": "pediatrics",
    "pregnancy": "gynecology", "menstrual": "gynecology", "uterus": "gynecology",
}


def suggest_specialization(symptoms: list) -> str:
    """Return best-matching specialization from symptom list."""
    symptoms_lower = " ".join(s.lower() for s in symptoms)
    scores: dict = {}
    for keyword, spec in SYMPTOM_SPECIALIZATION_MAP.items():
        if keyword in symptoms_lower:
            scores[spec] = scores.get(spec, 0) + 1
    return max(scores, key=lambda s: scores[s]) if scores else "general medicine"


async def find_available_doctors(org_id, specialization: str, db) -> list:
    """Find authorized, available doctors matching specialization."""
    from bson import ObjectId
    query = {
        "org_id": ObjectId(str(org_id)),
        "role": "doctor",
        "is_authorized": True,
        "is_active": True,
    }
    doctors = await db.users.find(query).to_list(100)

    # Filter: matching spec first, then general medicine, then all
    matched = [d for d in doctors if d.get("specialization", "").lower() == specialization.lower()]
    if not matched:
        matched = [d for d in doctors if d.get("specialization", "").lower() == "general medicine"]
    if not matched:
        matched = doctors

    def sort_key(d):
        status_rank = 0 if d.get("availability_status") == "available" else 1
        return (status_rank, -(d.get("reputation_score") or 5.0))

    return sorted(matched, key=sort_key)
