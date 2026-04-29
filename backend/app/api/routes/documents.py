from fastapi import APIRouter

router = APIRouter()

# POST /api/documents/upload  — accepts a PDF/XLSX financial statement
# GET  /api/documents/{document_id} — returns document metadata & status
# GET  /api/documents/          — lists all uploaded documents
