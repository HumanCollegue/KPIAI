from fastapi import APIRouter

router = APIRouter()

# POST /api/extractions/         — trigger extraction for a document_id
# GET  /api/extractions/{document_id} — return cached extraction result
