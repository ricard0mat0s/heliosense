from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import AuthTokenOut, UsuarioLogin, UsuarioOut, UsuarioRegister
from app.security import (
    create_access_token,
    get_client_ip,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/register", response_model=AuthTokenOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: UsuarioRegister,
    request: Request,
    repo: HelioSenseRepository = Depends(get_repository),
) -> AuthTokenOut:
    data = payload.model_dump()
    data["senha_hash"] = hash_password(data.pop("senha"))

    user = repo.create_user(data)
    repo.log_audit(
        cpf_usuario=user["cpf"],
        acao="CADASTRO",
        tabela_alvo="usuarios",
        id_alvo=user["cpf"],
        detalhes={"email": user["email"], "cidade": user["cidade"], "uf": user["uf"]},
        endereco_ip=get_client_ip(request),
    )

    token = create_access_token(cpf=user["cpf"], email=user["email"])
    return AuthTokenOut(access_token=token, usuario=UsuarioOut(**user))


@router.post("/login", response_model=AuthTokenOut)
def login(
    payload: UsuarioLogin,
    request: Request,
    repo: HelioSenseRepository = Depends(get_repository),
) -> AuthTokenOut:
    ip = get_client_ip(request)
    user = repo.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )

    if not user["ativo"]:
        repo.log_audit(
            cpf_usuario=user["cpf"],
            acao="LOGIN_CONTA_INATIVA",
            tabela_alvo="usuarios",
            id_alvo=user["cpf"],
            detalhes={"email": user["email"]},
            endereco_ip=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta foi desativada (ativo = FALSE) e não pode mais acessar o sistema.",
        )

    if not verify_password(payload.senha, user["senha_hash"]):
        repo.log_audit(
            cpf_usuario=user["cpf"],
            acao="LOGIN_FALHA",
            tabela_alvo="usuarios",
            id_alvo=user["cpf"],
            detalhes={"email": user["email"], "motivo": "senha_incorreta"},
            endereco_ip=ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )

    repo.log_audit(
        cpf_usuario=user["cpf"],
        acao="LOGIN",
        tabela_alvo="usuarios",
        id_alvo=user["cpf"],
        detalhes={"email": user["email"]},
        endereco_ip=ip,
    )

    token = create_access_token(cpf=user["cpf"], email=user["email"])
    return AuthTokenOut(access_token=token, usuario=UsuarioOut(**user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> None:
    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="LOGOUT",
        tabela_alvo="usuarios",
        id_alvo=current_user["cpf"],
        detalhes={"email": current_user["email"]},
        endereco_ip=get_client_ip(request),
    )
