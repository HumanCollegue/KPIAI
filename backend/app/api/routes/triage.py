from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.extraction import run_triage

router = APIRouter()


class TriageRequest(BaseModel):
    company_filename: str


@router.post("/")
def triage(body: TriageRequest):
    """
    POST /api/triage
    Runs the Claude-powered extraction on the specified PDF and returns
    the full structured triage result (meta + balance_sheet +
    income_statement + cash_flow).
    """
    try:
        return run_triage(body.company_filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
