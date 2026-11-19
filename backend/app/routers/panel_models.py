from typing import Any

from fastapi import APIRouter, Depends, Request, status

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import ModeloPainelCreate, ModeloPainelOut
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/modelos-paineis", tags=["Modelos de Painéis"])


@router.get("", response_model=list[ModeloPainelOut])
def list_panel_models(
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[ModeloPainelOut]:
    return [ModeloPainelOut(**row) for row in repo.list_panel_models()]


@router.post("", response_model=ModeloPainelOut, status_code=status.HTTP_201_CREATED)
def create_panel_model(
    payload: ModeloPainelCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> ModeloPainelOut:
    model = repo.create_panel_model(payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="CRIAR_MODELO_PAINEL",
        tabela_alvo="modelos_paineis",
        id_alvo=str(model["id_modelo"]),
        detalhes={
            "marca": model["marca"],
            "nome_modelo": model["nome_modelo"],
            "potencia_max_w": model["potencia_max_w"],
        },
        endereco_ip=get_client_ip(request),
    )
    return ModeloPainelOut(**model)
