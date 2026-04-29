from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import companies, triage, kpis, documents, extractions, display_names

app = FastAPI(
    title="KPI-AI",
    description="Financial statement analysis platform for Commercial Account Managers",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router,   prefix="/api/companies", tags=["companies"])
app.include_router(triage.router,     prefix="/api/triage",    tags=["triage"])
app.include_router(kpis.router,       prefix="/api/kpis",      tags=["kpis"])
app.include_router(documents.router,  prefix="/api/documents", tags=["documents"])
app.include_router(extractions.router,   prefix="/api/extractions",    tags=["extractions"])
app.include_router(display_names.router, prefix="/api/display-names",  tags=["display-names"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
