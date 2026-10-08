from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Category = Literal["Electrical", "Network", "Cleanliness", "Water", "Furniture", "Other"]
Priority = Literal["High", "Medium", "Low"]
IssueStatus = Literal["Open", "Resolved"]


class IssueInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=4000)
    location: str = Field(min_length=1, max_length=200)

    @field_validator("title", "description", "location")
    @classmethod
    def require_non_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class AnalysisResult(BaseModel):
    category: Category
    priority: Priority
    summary: str = Field(min_length=1, max_length=240)


class IssueResponse(IssueInput):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: Category
    priority: Priority
    summary: str
    status: IssueStatus
    created_at: str
