from fastapi import APIRouter
from progress_engine_service import translate_status

router = APIRouter(prefix="/api/progress-engine", tags=["Progress Engine"])

@router.get("/translate")
async def progress_translate(item_type: str, internal_status: str):
    return translate_status(item_type=item_type, internal_status=internal_status)
