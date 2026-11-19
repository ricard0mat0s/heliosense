from typing import Any

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.repositories import get_repository
from app.repositories.base import HelioSenseRepository
from app.schemas import DashboardResumoOut, ResumoCasaSPOut, ResumoPainelSPOut
from app.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/resumo", response_model=DashboardResumoOut)
def get_dashboard_resumo(
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> DashboardResumoOut:
    cpf = current_user["cpf"]
    settings = get_settings()

    # Primary aggregation powered by sp_resumo_energia_casa(cpf)
    casas_rs, paineis_rs = repo.get_dashboard_summary(cpf)

    # Enrich panel breakdown with operational metadata (status, model, open alerts)
    panels_meta = {p["id_painel"]: p for p in repo.list_panels(cpf)}
    open_alerts = repo.list_alerts(cpf, resolvido=False)

    casas_out = [ResumoCasaSPOut(**row) for row in casas_rs]
    paineis_out: list[ResumoPainelSPOut] = []
    for row in paineis_rs:
        meta = panels_meta.get(row["id_painel"], {})
        paineis_out.append(
            ResumoPainelSPOut(
                id_casa=row["id_casa"],
                id_painel=row["id_painel"],
                numero_serie=row["numero_serie"],
                energia_total_painel=row["energia_total_painel"],
                status=meta.get("status"),
                marca=meta.get("marca"),
                nome_modelo=meta.get("nome_modelo"),
                potencia_max_w=meta.get("potencia_max_w"),
                alertas_abertos=meta.get("alertas_abertos", 0),
            )
        )

    energia_total = round(sum(c.energia_total_casa for c in casas_out), 4)
    paineis_ativos = sum(1 for p in panels_meta.values() if p.get("status") == "ativo")

    return DashboardResumoOut(
        data_source=settings.data_source,
        energia_total_kwh=energia_total,
        total_casas=len(casas_out),
        total_paineis=len(paineis_out),
        paineis_ativos=paineis_ativos,
        alertas_abertos=len(open_alerts),
        casas=casas_out,
        paineis=paineis_out,
    )
