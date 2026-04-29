from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.display_names import get_all_display_names, set_display_name

router = APIRouter()


class DisplayNamePayload(BaseModel):
    display_name: str


@router.get("/")
def list_display_names():
    """GET /api/display-names/ — returns all custom display names."""
    return get_all_display_names()


@router.put("/{legal_name}")
def update_display_name(legal_name: str, payload: DisplayNamePayload):
    """PUT /api/display-names/{legal_name} — saves a custom display name."""
    if not legal_name.strip():
        raise HTTPException(status_code=400, detail="legal_name must not be blank")
    updated = set_display_name(legal_name, payload.display_name)
    return updated
