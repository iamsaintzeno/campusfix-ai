import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import database
from analyzer import analyze_issue
from schemas import AnalysisResult, IssueInput, IssueResponse


def get_allowed_origins() -> list[str]:
    default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    raw_origins = os.getenv("CORS_ORIGINS", "")
    if not raw_origins:
        return default_origins
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize_database()
    yield


app = FastAPI(title="CampusFix AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/issues", response_model=list[IssueResponse])
def get_issues() -> list[IssueResponse]:
    return database.list_issues()


@app.post("/analyze", response_model=AnalysisResult)
def analyze(issue: IssueInput) -> AnalysisResult:
    return analyze_issue(issue)


@app.post("/issues", response_model=IssueResponse, status_code=201)
def submit_issue(issue: IssueInput) -> IssueResponse:
    analysis = analyze_issue(issue)
    return database.create_issue(
        title=issue.title.strip(),
        description=issue.description.strip(),
        location=issue.location.strip(),
        category=analysis.category,
        priority=analysis.priority,
        summary=analysis.summary,
    )


@app.patch("/issues/{issue_id}/resolve", response_model=IssueResponse)
def mark_resolved(issue_id: int) -> IssueResponse:
    issue = database.resolve_issue(issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue
