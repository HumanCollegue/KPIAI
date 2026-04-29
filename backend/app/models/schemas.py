from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


# --- Document ---

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    uploaded_at: datetime
    status: str  # "pending" | "processing" | "ready" | "error"


# --- Extraction ---

class ExtractionRequest(BaseModel):
    document_id: str


class LineItem(BaseModel):
    label: str
    value: Optional[float]
    unit: str = "CAD"
    source_page: Optional[int]
    flagged: bool = False
    flag_reason: Optional[str]


class ExtractionResult(BaseModel):
    document_id: str
    company_name: Optional[str]
    fiscal_year_end: Optional[str]
    line_items: List[LineItem]
    extracted_at: datetime
    raw_response: Optional[Dict[str, Any]]


# --- KPI ---

class KPIRequest(BaseModel):
    document_id: str
    kpi_keys: List[str]  # e.g. ["current_ratio", "debt_to_equity"]


class KPIResult(BaseModel):
    key: str
    label: str
    value: Optional[float]
    formula: str
    flagged: bool = False
    flag_reason: Optional[str]


class KPIResponse(BaseModel):
    document_id: str
    kpis: List[KPIResult]
    calculated_at: datetime
