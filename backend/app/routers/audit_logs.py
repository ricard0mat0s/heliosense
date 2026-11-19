from typing import Any

from fastapi import APIRouter, Depends, Query

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import LogAuditoriaOut
from app.security import get_current_user

router = APIRouter(prefix="/api/auditoria", tags=["Logs de Auditoria"])


@router.get("", response_model=list[LogAuditoriaOut])
def list_audit_logs(
    acao: str | None = Query(default=None, max_length=60),
    tabela_alvo: str | None = Query(default=None, max_length=60),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[LogAuditoriaOut]:
    rows = repo.list_audit_logs(
        cpf=current_user["cpf"],
        acao=acao,
        tabela_alvo=tabela_alvo,
        limit=limit,
    )
    return [LogAuditoriaOut(**row) for row in rows]
