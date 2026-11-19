from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import CasaCreate, CasaOut, CasaUpdate
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/casas", tags=["Casas"])


@router.get("", response_model=list[CasaOut])
def list_houses(
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[CasaOut]:
    return [CasaOut(**row) for row in repo.list_houses(current_user["cpf"])]


@router.get("/{id_casa}", response_model=CasaOut)
def get_house(
    id_casa: int,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> CasaOut:
    house = repo.get_house(id_casa, current_user["cpf"])
    if not house:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Casa não encontrada.")
    return CasaOut(**house)


@router.post("", response_model=CasaOut, status_code=status.HTTP_201_CREATED)
def create_house(
    payload: CasaCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> CasaOut:
    house = repo.create_house(current_user["cpf"], payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="CRIAR_CASA",
        tabela_alvo="casas",
        id_alvo=str(house["id_casa"]),
        detalhes={"nome": house["nome"], "cidade": house["cidade"], "uf": house["uf"]},
        endereco_ip=get_client_ip(request),
    )
    return CasaOut(**house)


@router.put("/{id_casa}", response_model=CasaOut)
def update_house(
    id_casa: int,
    payload: CasaUpdate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> CasaOut:
    house = repo.update_house(id_casa, current_user["cpf"], payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="ATUALIZAR_CASA",
        tabela_alvo="casas",
        id_alvo=str(id_casa),
        detalhes={"nome": house["nome"], "cidade": house["cidade"], "uf": house["uf"]},
        endereco_ip=get_client_ip(request),
    )
    return CasaOut(**house)


@router.delete("/{id_casa}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(
    id_casa: int,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> None:
    repo.delete_house(id_casa, current_user["cpf"])
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="EXCLUIR_CASA",
        tabela_alvo="casas",
        id_alvo=str(id_casa),
        detalhes={"id_casa": id_casa},
        endereco_ip=get_client_ip(request),
    )
