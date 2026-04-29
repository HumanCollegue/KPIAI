from fastapi import APIRouter
from app.core.companies import COMPANIES

router = APIRouter()


@router.get("/")
def list_companies():
    """
    GET /api/companies
    Returns the full list of 55 approved companies with display_name,
    pdf_filename, and sector for each.
    """
    return [
        {
            "display_name": c.display_name,
            "pdf_filename": c.pdf_filename,
            "sector":       c.sector,
        }
        for c in COMPANIES
    ]
