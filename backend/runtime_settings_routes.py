"""
Runtime Settings Routes
Exposes integration configuration status
"""
from fastapi import APIRouter
from runtime_settings_service import get_runtime_settings

router = APIRouter(prefix="/api/runtime-settings", tags=["Runtime Settings"])


@router.get("")
async def runtime_settings():
    """Get runtime integration configuration status"""
    return get_runtime_settings()
