from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import PainelCreate, PainelOut, PainelUpdate
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/paineis", tags=["Painéis"])


@router.get("", response_model=list[PainelOut])
def list_panels(
    id_casa: int | None = Query(default=None, gt=0),
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[PainelOut]:
    return [PainelOut(**row) for row in repo.list_panels(current_user["cpf"], id_casa=id_casa)]


@router.get("/{id_painel}", response_model=PainelOut)
def get_panel(
    id_painel: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> PainelOut:
    panel = repo.get_panel(id_painel, current_user["cpf"])
    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Painel não encontrado.")
    return PainelOut(**panel)


@router.post("", response_model=PainelOut, status_code=status.HTTP_201_CREATED)
def create_panel(
    payload: PainelCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> PainelOut:
    panel = repo.create_panel(current_user["cpf"], payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="CRIAR_PAINEL",
        tabela_alvo="paineis",
        id_alvo=str(panel["id_painel"]),
        detalhes={
            "id_casa": panel["id_casa"],
            "id_modelo": panel["id_modelo"],
            "numero_serie": panel["numero_serie"],
            "status": panel["status"],
        },
        endereco_ip=get_client_ip(request),
    )
    return PainelOut(**panel)


@router.put("/{id_painel}", response_model=PainelOut)
def update_panel(
    id_painel: int,
    payload: PainelUpdate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> PainelOut:
    panel = repo.update_panel(id_painel, current_user["cpf"], payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="ATUALIZAR_PAINEL",
        tabela_alvo="paineis",
        id_alvo=str(id_painel),
        detalhes={
            "id_casa": panel["id_casa"],
            "numero_serie": panel["numero_serie"],
            "status": panel["status"],
        },
        endereco_ip=get_client_ip(request),
    )
    return PainelOut(**panel)


@router.delete("/{id_painel}", status_code=status.HTTP_204_NO_CONTENT)
def delete_panel(
    id_painel: int,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> None:
    repo.delete_panel(id_painel, current_user["cpf"])
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="EXCLUIR_PAINEL",
        tabela_alvo="paineis",
        id_alvo=str(id_painel),
        detalhes={"id_painel": id_painel},
        endereco_ip=get_client_ip(request),
    )
