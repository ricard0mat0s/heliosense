from typing import Any

from fastapi import APIRouter, Depends, Request

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import UsuarioOut, UsuarioUpdate
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/usuarios", tags=["Usuários"])


@router.get("/me", response_model=UsuarioOut)
def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> UsuarioOut:
    return UsuarioOut(**current_user)


@router.put("/me", response_model=UsuarioOut)
def update_me(
    payload: UsuarioUpdate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> UsuarioOut:
    updated = repo.update_user(current_user["cpf"], payload.model_dump())
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="ATUALIZAR_PERFIL",
        tabela_alvo="usuarios",
        id_alvo=current_user["cpf"],
        detalhes={"cidade": updated["cidade"], "uf": updated["uf"]},
        endereco_ip=get_client_ip(request),
    )
    return UsuarioOut(**updated)


@router.post("/me/desativar")
def deactivate_me(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> dict[str, str]:
    repo.deactivate_user(current_user["cpf"])
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="DESATIVAR_CONTA",
        tabela_alvo="usuarios",
        id_alvo=current_user["cpf"],
        detalhes={"ativo": False, "motivo": "exclusao_logica_solicitada_pelo_usuario"},
        endereco_ip=get_client_ip(request),
    )
    return {
        "mensagem": "Conta desativada com sucesso (ativo = FALSE). Seus registros históricos e logs de auditoria foram preservados."
    }
