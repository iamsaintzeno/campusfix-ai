import json
import logging
import os
import re
import urllib.error
import urllib.request

from dotenv import load_dotenv
from pydantic import ValidationError

from schemas import AnalysisResult, IssueInput


load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

CATEGORY_KEYWORDS = {
    "Network": ("wifi", "wi-fi", "internet", "router", "network"),
    "Water": ("water", "leakage", "leaking", "tap", "pipe"),
    "Electrical": (
        "fan",
        "light",
        "switch",
        "socket",
        "electricity",
        "electrical",
        "shock",
        "spark",
        "fire",
        "power outage",
    ),
    "Cleanliness": ("dirty", "garbage", "dust", "toilet", "cleaning"),
    "Furniture": ("chair", "desk", "bench", "table", "furniture"),
}


def analyze_issue(issue: IssueInput) -> AnalysisResult:
    if GEMINI_API_KEY:
        try:
            return _analyze_with_gemini(issue)
        except (
            OSError,
            TimeoutError,
            urllib.error.URLError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
            ValidationError,
        ) as error:
            logger.warning("Gemini analysis failed; using local fallback: %s", error)
    return _analyze_locally(issue)


def _analyze_locally(issue: IssueInput) -> AnalysisResult:
    text = f"{issue.title} {issue.description}".lower()
    category = next(
        (
            name
            for name, keywords in CATEGORY_KEYWORDS.items()
            if any(keyword in text for keyword in keywords)
        ),
        "Other",
    )

    high_priority_terms = (
        "fire",
        "spark",
        "electric shock",
        "major leakage",
        "major leak",
        "no electricity",
        "power outage",
        "no power",
    )
    network_outage_scope = (
        "all computers",
        "entire lab",
        "whole lab",
        "all of the lab",
        "entire classroom",
        "whole classroom",
        "entire class",
        "whole class",
    )
    is_network_outage = (
        any(term in text for term in ("wifi", "wi-fi", "internet", "network"))
        and any(term in text for term in network_outage_scope)
        and any(term in text for term in ("stopped working", "not working", "unavailable", "outage", "down"))
    )

    if is_network_outage or any(term in text for term in high_priority_terms):
        priority = "High"
    elif any(
        term in text
        for term in ("minor", "cosmetic", "small damage", "slightly", "non-urgent", "non urgent")
    ):
        priority = "Low"
    elif category in {"Electrical", "Network", "Cleanliness", "Water", "Furniture"}:
        priority = "Medium"
    else:
        priority = "Low"

    summary = f"{issue.title.strip()} in {issue.location.strip()}"
    if len(summary) > 240:
        summary = summary[:237].rstrip() + "..."
    return AnalysisResult(category=category, priority=priority, summary=summary)


def _analyze_with_gemini(issue: IssueInput) -> AnalysisResult:
    prompt = (
        "Analyze this campus maintenance report. Return only a JSON object with keys "
        '"category", "priority", and "summary". Category must be one of Electrical, '
        "Network, Cleanliness, Water, Furniture, Other. Priority must be High, Medium, "
        "or Low. Keep summary short. Prioritize safety hazards, major leaks, power "
        "loss, and campus-wide or whole-lab network outages as High. "
        f"Title: {issue.title}\nDescription: {issue.description}\nLocation: {issue.location}"
    )
    request_body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        payload = json.loads(response.read().decode("utf-8"))
    result_text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return AnalysisResult.model_validate(json.loads(result_text))
