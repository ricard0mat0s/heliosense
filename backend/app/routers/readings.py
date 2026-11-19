import math
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.repositories import get_repository
from app.repositories.base import ConflictError, HelioSenseRepository
from app.schemas import (
    AlertaOut,
    LeituraCreate,
    LeituraDiariaOut,
    LeituraHorariaOut,
    LeituraRegistroOut,
    SimularDiaCreate,
    SimularDiaOut,
)
from app.security import get_client_ip, get_current_user

router = APIRouter(prefix="/api/paineis", tags=["Leituras de Energia"])


def _hourly_solar_kwh(hour: int, max_power_w: int) -> Decimal:
    if hour < 6 or hour > 18:
        return Decimal("0.0000")
    peak_kwh = (max_power_w / 1000.0) * 0.90
    normalized = math.sin(((hour - 6) / 12.0) * math.pi)
    value = max(0.0, peak_kwh * (normalized**1.35))
    return Decimal(f"{value:.4f}")


@router.get("/{id_painel}/leituras/horaria", response_model=list[LeituraHorariaOut])
def get_hourly_readings(
    id_painel: int,
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    limit: int = Query(default=72, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[LeituraHorariaOut]:
    rows = repo.get_hourly_readings(
        id_painel=id_painel,
        cpf=current_user["cpf"],
        data_inicio=data_inicio.replace(tzinfo=None) if data_inicio else None,
        data_fim=data_fim.replace(tzinfo=None) if data_fim else None,
        limit=limit,
    )
    return [LeituraHorariaOut(**row) for row in rows]


@router.get("/{id_painel}/leituras/diaria", response_model=list[LeituraDiariaOut])
def get_daily_readings(
    id_painel: int,
    data_inicio: date | None = Query(default=None),
    data_fim: date | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=365),
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> list[LeituraDiariaOut]:
    rows = repo.get_daily_readings(
        id_painel=id_painel,
        cpf=current_user["cpf"],
        data_inicio=data_inicio,
        data_fim=data_fim,
        limit=limit,
    )
    return [LeituraDiariaOut(**row) for row in rows]


@router.post(
    "/{id_painel}/leituras",
    response_model=LeituraRegistroOut,
    status_code=status.HTTP_201_CREATED,
)
def create_reading(
    id_painel: int,
    payload: LeituraCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> LeituraRegistroOut:
    result = repo.insert_reading(
        id_painel=id_painel,
        cpf=current_user["cpf"],
        registrado_em=payload.registrado_em,
        energia_kwh=payload.energia_kwh,
    )

    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="REGISTRAR_LEITURA",
        tabela_alvo="leituras_energia",
        id_alvo=str(result["id_leitura"]),
        detalhes={
            "id_painel": id_painel,
            "registrado_em": payload.registrado_em.isoformat(),
            "energia_kwh": float(payload.energia_kwh),
            "alertas_disparados": len(result["alertas_gerados"]),
        },
        endereco_ip=get_client_ip(request),
    )

    return LeituraRegistroOut(
        id_leitura=result["id_leitura"],
        id_painel=result["id_painel"],
        registrado_em=result["registrado_em"],
        energia_kwh=result["energia_kwh"],
        alertas_gerados=[AlertaOut(**a) for a in result["alertas_gerados"]],
    )


@router.post(
    "/{id_painel}/leituras/simular-dia",
    response_model=SimularDiaOut,
    status_code=status.HTTP_201_CREATED,
)
def simulate_day(
    id_painel: int,
    payload: SimularDiaCreate,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    repo: HelioSenseRepository = Depends(get_repository),
) -> SimularDiaOut:
    panel = repo.get_panel(id_painel, current_user["cpf"])
    if not panel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Painel não encontrado.")

    max_w = int(panel["potencia_max_w"])
    inserted = 0
    skipped = 0
    all_alerts: list[AlertaOut] = []

    for hour in range(24):
        ts = datetime.combine(payload.data, time(hour=hour, minute=0, second=0))
        kwh = _hourly_solar_kwh(hour, max_w)

        if payload.incluir_anomalia == "zero_diurno" and hour == 13:
            kwh = Decimal("0.0000")
        elif payload.incluir_anomalia == "acima_capacidade" and hour == 12:
            kwh = Decimal(f"{(max_w / 1000.0) * 1.35:.4f}")

        try:
            res = repo.insert_reading(
                id_painel=id_painel,
                cpf=current_user["cpf"],
                registrado_em=ts,
                energia_kwh=kwh,
            )
            inserted += 1
            all_alerts.extend(AlertaOut(**a) for a in res["alertas_gerados"])
        except ConflictError:
            skipped += 1

    repo.log_audit(
        cpf_usuario=current_user["cpf"],
        acao="SIMULAR_CURVA_24H",
        tabela_alvo="leituras_energia",
        id_alvo=str(id_painel),
        detalhes={
            "data": payload.data.isoformat(),
            "incluir_anomalia": payload.incluir_anomalia,
            "leituras_inseridas": inserted,
            "leituras_ignoradas": skipped,
            "alertas_disparados": len(all_alerts),
        },
        endereco_ip=get_client_ip(request),
    )

    return SimularDiaOut(
        leituras_inseridas=inserted,
        leituras_ignoradas=skipped,
        alertas_gerados=all_alerts,
    )
