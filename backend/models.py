from dataclasses import dataclass


@dataclass
class Issue:
    id: int
    title: str
    description: str
    location: str
    category: str
    priority: str
    summary: str
    status: str
    created_at: str
