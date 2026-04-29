# KPI-AI

Financial analysis platform for Commercial Account Managers (CAMs). Upload audited annual financial statements from Canadian public companies to automatically extract key financial line items, flag anomalies, and calculate KPIs on demand.

---

## Architecture

```
KPIAI/
├── backend/          # Python FastAPI
│   └── app/
│       ├── api/
│       │   └── routes/
│       │       ├── documents.py    # Upload & retrieve financial statements
│       │       ├── extractions.py  # Trigger & retrieve AI-powered extraction
│       │       └── kpis.py         # KPI catalog & calculation
│       ├── core/
│       │   └── config.py           # Environment-based settings
│       ├── models/
│       │   └── schemas.py          # Pydantic request/response models
│       └── services/
│           ├── extraction.py       # Claude-powered line item extraction
│           └── kpi.py              # KPI calculation engine
└── frontend/         # React (Vite)
    └── src/
        ├── pages/
        │   ├── UploadPage.jsx      # Document upload
        │   ├── ExtractionPage.jsx  # Review extracted line items
        │   └── KPIPage.jsx         # Select & view KPIs
        └── services/
            └── api.js              # Axios API client
```

## Core Workflow

1. **Upload** — CAM uploads a PDF or XLSX audited financial statement.
2. **Extract** — Claude (via Anthropic SDK) parses the document and returns structured line items (revenue, EBITDA, total assets, current liabilities, etc.).
3. **Flag** — Anomalies or missing values are flagged automatically.
4. **Calculate** — CAM selects KPIs from a catalog; the platform computes them from the extracted data.

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`  
Docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | Python 3.12, FastAPI, Uvicorn       |
| AI        | Anthropic Claude (claude-sonnet-4-6)|
| Parsing   | pdfplumber, pandas, openpyxl        |
| Frontend  | React 18, React Router, Axios, Vite |
| Validation| Pydantic v2                         |
