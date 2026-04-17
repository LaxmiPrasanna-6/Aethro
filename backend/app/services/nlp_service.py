"""
Rule-based NLP parser for natural language booking requests.
Extracts: resource_type, capacity, date, time_slot, facilities, priority
"""
import re
from datetime import datetime, timedelta


RESOURCE_KEYWORDS = {
    "lab": ["lab", "laboratory", "computer lab"],
    "classroom": ["class", "classroom", "lecture hall", "lecture room", "room"],
    "seminar_hall": ["seminar", "seminar hall", "auditorium", "conference"],
    "ward": ["ward", "patient ward"],
    "icu": ["icu", "intensive care", "critical care"],
    "ot": ["ot", "operation theatre", "operating room", "surgery"],
    "consultation": ["consultation", "doctor room", "outpatient", "opd"],
}

FACILITY_KEYWORDS = {
    "projector": ["projector", "screen", "presentation"],
    "computers": ["computers", "computer", "pc", "laptop"],
    "ac": ["ac", "air conditioning", "air conditioned", "cool"],
    "whiteboard": ["whiteboard", "board", "blackboard"],
    "audio_system": ["audio", "speaker", "mic", "microphone", "sound"],
}

TIME_PERIOD_MAP = {
    "morning": {"start": "08:00", "end": "12:00"},
    "afternoon": {"start": "12:00", "end": "16:00"},
    "evening": {"start": "16:00", "end": "20:00"},
    "night": {"start": "20:00", "end": "23:00"},
    "full day": {"start": "08:00", "end": "20:00"},
}

PRIORITY_KEYWORDS = {
    "high": ["urgent", "emergency", "critical", "high priority", "asap", "important"],
    "medium": ["normal", "regular", "medium"],
    "low": ["low", "flexible", "whenever"],
}


def parse_date(text: str) -> str:
    today = datetime.now().date()
    text_lower = text.lower()

    if "tomorrow" in text_lower:
        return str(today + timedelta(days=1))
    if "today" in text_lower:
        return str(today)
    if "day after tomorrow" in text_lower:
        return str(today + timedelta(days=2))

    # Match "next Monday" etc.
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day in enumerate(days):
        if day in text_lower:
            current_weekday = today.weekday()
            days_ahead = (i - current_weekday) % 7
            if days_ahead == 0:
                days_ahead = 7
            return str(today + timedelta(days=days_ahead))

    # Match explicit date patterns: DD/MM, DD-MM, etc.
    date_match = re.search(r"(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?", text)
    if date_match:
        day, month = int(date_match.group(1)), int(date_match.group(2))
        year = int(date_match.group(3)) if date_match.group(3) else today.year
        if year < 100:
            year += 2000
        try:
            return str(datetime(year, month, day).date())
        except ValueError:
            pass

    return str(today + timedelta(days=1))  # default: tomorrow


def parse_time_slot(text: str) -> dict:
    text_lower = text.lower()

    for period, slot in TIME_PERIOD_MAP.items():
        if period in text_lower:
            return slot

    # Match explicit "HH:MM to HH:MM" or "HH AM to HH PM"
    match = re.search(r"(\d{1,2}(?::\d{2})?)\s*(?:am|pm)?\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?)\s*(?:am|pm)?", text_lower)
    if match:
        start_raw = match.group(1)
        end_raw = match.group(2)
        start = _normalize_time(start_raw, "am" in text_lower[:match.start() + 10])
        end = _normalize_time(end_raw, "pm" in text_lower[match.start():match.end()])
        return {"start": start, "end": end}

    return {"start": "09:00", "end": "11:00"}


def _normalize_time(t: str, is_pm: bool = False) -> str:
    parts = t.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    if is_pm and hour < 12:
        hour += 12
    return f"{hour:02d}:{minute:02d}"


def parse_capacity(text: str) -> int:
    text_lower = text.lower()
    patterns = [
        r"for\s+(\d+)\s+(?:people|students|persons|users|members)",
        r"(\d+)\s+(?:people|students|persons|users|members|capacity|seats)",
        r"capacity\s+(?:of\s+)?(\d+)",
        r"(\d+)\s+seat",
    ]
    for pattern in patterns:
        m = re.search(pattern, text_lower)
        if m:
            return int(m.group(1))
    return 1


def parse_resource_type(text: str) -> str:
    text_lower = text.lower()
    for rtype, keywords in RESOURCE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return rtype
    return "classroom"


def parse_facilities(text: str) -> list:
    text_lower = text.lower()
    found = []
    for facility, keywords in FACILITY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(facility)
                break
    return found


def parse_priority(text: str) -> str:
    text_lower = text.lower()
    for priority, keywords in PRIORITY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return priority
    return "medium"


def parse_nlp_booking(raw_text: str) -> dict:
    return {
        "resource_type": parse_resource_type(raw_text),
        "required_capacity": parse_capacity(raw_text),
        "date": parse_date(raw_text),
        "time_slot": parse_time_slot(raw_text),
        "required_facilities": parse_facilities(raw_text),
        "priority": parse_priority(raw_text),
        "purpose": raw_text[:200],
        "justification": f"Auto-parsed from: '{raw_text}'",
        "nlp_parsed": True,
        "nlp_raw_text": raw_text,
    }
