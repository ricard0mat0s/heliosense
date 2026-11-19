from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import AlertaOut, TipoAlerta
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/alertas", tags=["Alertas"])


@router.get("", response_model=list[AlertaOut])
def list_alerts(
    resolvido: bool | None = Query(default=None),
    id_painel: int | None = Query(default=None, gt=0),
    tipo_alerta: TipoAlerta | None = Query(default=None),
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[AlertaOut]:
    rows = repo.list_alerts(
        cpf=current_user["cpf"],
        resolvido=resolvido,
        id_painel=id_painel,
        tipo_alerta=tipo_alerta,
    )
    return [AlertaOut(**row) for row in rows]


@router.patch("/{id_alerta}/resolver", response_model=AlertaOut)
def resolve_alert(
    id_alerta: int,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> AlertaOut:
    alert = repo.resolve_alert(id_alerta, current_user["cpf"])
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="RESOLVER_ALERTA",
        tabela_alvo="alertas",
        id_alvo=str(id_alerta),
        detalhes={
            "id_painel": alert["id_painel"],
            "tipo_alerta": alert["tipo_alerta"],
            "resolvido": True,
        },
        endereco_ip=get_client_ip(request),
    )
    return AlertaOut(**alert)
