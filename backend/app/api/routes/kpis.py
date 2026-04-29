from fastapi import APIRouter
from pydantic import BaseModel
from app.services.kpi import list_kpis, calculate_kpi

router = APIRouter()


class CalculateRequest(BaseModel):
    kpi_name: str
    extraction_result: dict


@router.get("/catalog")
def kpi_catalog():
    """
    GET /api/kpis/catalog
    Returns all 12 supported KPIs with display_name, formula,
    dependencies, and requires_prior_year for each.
    """
    return list_kpis()


@router.post("/calculate")
def kpi_calculate(body: CalculateRequest):
    """
    POST /api/kpis/calculate
    Calculates a single KPI from a previously obtained extraction result.
    Always returns HTTP 200 — use the 'status' field in the response body
    ('calculated' | 'blocked' | 'error' | 'unknown_kpi') to determine outcome.
    """
    return calculate_kpi(body.kpi_name, body.extraction_result)
