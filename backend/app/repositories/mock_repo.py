import copy
import json
import math
import threading
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

import bcrypt

from app.repositories.base import (
    ConflictError,
    HelioSenseRepository,
    NotFoundError,
    ValidationDomainError,
)


def _solar_curve_kwh(hour: int, max_power_w: int, cloud_factor: float = 0.88) -> Decimal:
    """Realistic residential hourly generation profile in kWh (bell curve 06:00-18:00)."""
    if hour < 6 or hour > 18:
        return Decimal("0.0000")
    peak_kwh = (max_power_w / 1000.0) * cloud_factor
    normalized = math.sin(((hour - 6) / 12.0) * math.pi)
    value = max(0.0, peak_kwh * (normalized**1.35))
    return Decimal(f"{value:.4f}")


class MockRepository(HelioSenseRepository):
    """
    In-memory repository mirroring the exact MySQL schema, constraints
    (UNIQUE, ON DELETE RESTRICT), VIEWs, sp_resumo_energia_casa, and AFTER INSERT trigger.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._users: dict[str, dict[str, Any]] = {}
        self._houses: dict[int, dict[str, Any]] = {}
        self._models: dict[int, dict[str, Any]] = {}
        self._panels: dict[int, dict[str, Any]] = {}
        self._readings: dict[int, dict[str, Any]] = {}
        self._alerts: dict[int, dict[str, Any]] = {}
        self._audit_logs: list[dict[str, Any]] = []

        self._next_house_id = 1
        self._next_model_id = 1
        self._next_panel_id = 1
        self._next_reading_id = 1
        self._next_alert_id = 1
        self._next_log_id = 1

        self._seed_demo_data()

    def _seed_demo_data(self) -> None:
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        demo_cpf = "12345678901"
        demo_hash = bcrypt.hashpw(b"HelioSense@2026", bcrypt.gensalt()).decode("utf-8")

        self._users[demo_cpf] = {
            "cpf": demo_cpf,
            "nome": "Marina Oliveira Silva",
            "data_nascimento": date(1992, 5, 14),
            "email": "demo@heliosense.com.br",
            "senha_hash": demo_hash,
            "telefone": "(38) 99812-4400",
            "logradouro": "Av. Professora Aida Mainartina Paraíso",
            "numero": "415",
            "complemento": "Casa A",
            "bairro": "Ibituruna",
            "cidade": "Montes Claros",
            "uf": "MG",
            "cep": "39408007",
            "ativo": True,
            "criado_em": now - timedelta(days=45),
        }

        # Seed shared panel models catalog
        models_seed = [
            ("Canadian Solar", "HiKu6 Mono PERC 550W", 550, 21.30),
            ("Jinko Solar", "Tiger Neo N-Type 580W", 580, 22.45),
            ("WEG Solar", "W-Mono 450W Residencial", 450, 20.60),
            ("Trina Solar", "Vertex S+ 505W", 505, 21.80),
        ]
        for marca, nome_modelo, pot, eff in models_seed:
            mid = self._next_model_id
            self._next_model_id += 1
            self._models[mid] = {
                "id_modelo": mid,
                "marca": marca,
                "nome_modelo": nome_modelo,
                "potencia_max_w": pot,
                "eficiencia_pct": eff,
            }

        # Seed 2 residential houses
        h1 = self._next_house_id
        self._next_house_id += 1
        self._houses[h1] = {
            "id_casa": h1,
            "cpf_proprietario": demo_cpf,
            "nome": "Residência Principal — Ibituruna",
            "logradouro": "Av. Professora Aida Mainartina Paraíso",
            "numero": "415",
            "complemento": "Casa A",
            "bairro": "Ibituruna",
            "cidade": "Montes Claros",
            "uf": "MG",
            "cep": "39408007",
            "criado_em": now - timedelta(days=40),
        }

        h2 = self._next_house_id
        self._next_house_id += 1
        self._houses[h2] = {
            "id_casa": h2,
            "cpf_proprietario": demo_cpf,
            "nome": "Chácara Serra Azul",
            "logradouro": "Estrada da Serra",
            "numero": "Km 8",
            "complemento": "Lote 12",
            "bairro": "Zona Rural",
            "cidade": "Montes Claros",
            "uf": "MG",
            "cep": "39400000",
            "criado_em": now - timedelta(days=20),
        }

        # Seed 5 panels across the 2 houses
        panels_seed = [
            (h1, 1, "CS-550-MG-0001", date(2025, 8, 10), "ativo"),
            (h1, 1, "CS-550-MG-0002", date(2025, 8, 10), "ativo"),
            (h1, 2, "JK-580-MG-0003", date(2026, 1, 15), "ativo"),
            (h2, 3, "WG-450-MG-0101", date(2026, 3, 2), "ativo"),
            (h2, 4, "TR-505-MG-0102", date(2026, 3, 2), "manutencao"),
        ]
        for id_casa, id_modelo, serial, inst_date, st in panels_seed:
            pid = self._next_panel_id
            self._next_panel_id += 1
            self._panels[pid] = {
                "id_painel": pid,
                "id_casa": id_casa,
                "id_modelo": id_modelo,
                "numero_serie": serial,
                "data_instalacao": inst_date,
                "status": st,
            }

        # Seed 7 full days of realistic hourly readings + intentional trigger anomalies
        base_day = (now - timedelta(days=6)).replace(hour=0)
        day_weather = [0.92, 0.88, 0.72, 0.95, 0.91, 0.84, 0.90]

        for pid, panel in self._panels.items():
            max_w = self._models[panel["id_modelo"]]["potencia_max_w"]
            for day_idx in range(7):
                day_start = base_day + timedelta(days=day_idx)
                cloud = day_weather[day_idx]
                for hour in range(24):
                    ts = day_start + timedelta(hours=hour)
                    if ts > now:
                        continue
                    kwh = _solar_curve_kwh(hour, max_w, cloud_factor=cloud)

                    # Inject two realistic anomalies to showcase open/resolved alerts
                    if pid == 2 and day_idx == 5 and hour == 13:
                        kwh = Decimal("0.0000")  # ZERO_DIURNO
                    elif pid == 3 and day_idx == 4 and hour == 12:
                        kwh = Decimal(f"{(max_w / 1000.0) * 1.28:.4f}")  # ACIMA_CAPACIDADE
                    elif pid == 5 and day_idx == 6 and hour == 11:
                        kwh = Decimal("0.0000")  # ZERO_DIURNO (panel in manutencao)

                    self._insert_reading_internal(pid, ts, kwh, created_at=ts + timedelta(minutes=1))

        # Mark the oldest anomaly alert as already resolved for demo contrast
        if self._alerts:
            first_alert_id = min(self._alerts.keys())
            self._alerts[first_alert_id]["resolvido"] = True
            self._alerts[first_alert_id]["resolvido_em"] = now - timedelta(hours=18)

        # Seed sample audit trail
        seed_logs = [
            ("CADASTRO", "usuarios", demo_cpf, {"email": "demo@heliosense.com.br"}, now - timedelta(days=45)),
            ("CRIAR_CASA", "casas", str(h1), {"nome": "Residência Principal — Ibituruna"}, now - timedelta(days=40)),
            ("CRIAR_PAINEL", "paineis", "1", {"numero_serie": "CS-550-MG-0001"}, now - timedelta(days=40)),
            ("CRIAR_CASA", "casas", str(h2), {"nome": "Chácara Serra Azul"}, now - timedelta(days=20)),
            ("ATUALIZAR_PAINEL", "paineis", "5", {"status": "manutencao"}, now - timedelta(days=1)),
            ("RESOLVER_ALERTA", "alertas", "1", {"resolvido": True}, now - timedelta(hours=18)),
        ]
        for acao, tabela, alvo, det, ts in seed_logs:
            lid = self._next_log_id
            self._next_log_id += 1
            self._audit_logs.append(
                {
                    "id_log": lid,
                    "cpf_usuario": demo_cpf,
                    "acao": acao,
                    "tabela_alvo": tabela,
                    "id_alvo": alvo,
                    "detalhes": json.dumps(det, ensure_ascii=False),
                    "endereco_ip": "127.0.0.1",
                    "criado_em": ts,
                }
            )

    def _insert_reading_internal(
        self,
        id_painel: int,
        registrado_em: datetime,
        energia_kwh: Decimal,
        created_at: datetime | None = None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        for existing in self._readings.values():
            if existing["id_painel"] == id_painel and existing["registrado_em"] == registrado_em:
                raise ConflictError(
                    "Já existe uma leitura registrada para este painel neste mesmo horário."
                )

        rid = self._next_reading_id
        self._next_reading_id += 1
        reading = {
            "id_leitura": rid,
            "id_painel": id_painel,
            "registrado_em": registrado_em,
            "energia_kwh": energia_kwh,
        }
        self._readings[rid] = reading

        # Mirror MySQL AFTER INSERT trigger on leituras_energia
        panel = self._panels[id_painel]
        model = self._models[panel["id_modelo"]]
        max_kwh_hour = Decimal(model["potencia_max_w"]) / Decimal("1000")
        created_ts = created_at or datetime.now()
        triggered: list[dict[str, Any]] = []

        if energia_kwh == Decimal("0") and 8 <= registrado_em.hour <= 18:
            aid = self._next_alert_id
            self._next_alert_id += 1
            alert = {
                "id_alerta": aid,
                "id_painel": id_painel,
                "id_leitura": rid,
                "tipo_alerta": "ZERO_DIURNO",
                "mensagem": (
                    f"Painel {panel['numero_serie']} registrou 0,0000 kWh no horário diurno "
                    f"({registrado_em.strftime('%d/%m/%Y %H:%M')}). Verifique sombreamento ou falha."
                ),
                "resolvido": False,
                "criado_em": created_ts,
                "resolvido_em": None,
            }
            self._alerts[aid] = alert
            triggered.append(self._enrich_alert(alert))

        if energia_kwh > max_kwh_hour:
            aid = self._next_alert_id
            self._next_alert_id += 1
            alert = {
                "id_alerta": aid,
                "id_painel": id_painel,
                "id_leitura": rid,
                "tipo_alerta": "ACIMA_CAPACIDADE",
                "mensagem": (
                    f"Leitura de {float(energia_kwh):.4f} kWh excede o limite físico de "
                    f"{float(max_kwh_hour):.4f} kWh ({model['potencia_max_w']}W) do painel {panel['numero_serie']}."
                ),
                "resolvido": False,
                "criado_em": created_ts,
                "resolvido_em": None,
            }
            self._alerts[aid] = alert
            triggered.append(self._enrich_alert(alert))

        return reading, triggered

    def _enrich_alert(self, alert: dict[str, Any]) -> dict[str, Any]:
        panel = self._panels[alert["id_painel"]]
        house = self._houses[panel["id_casa"]]
        out = copy.deepcopy(alert)
        out["numero_serie"] = panel["numero_serie"]
        out["id_casa"] = house["id_casa"]
        out["nome_casa"] = house["nome"]
        return out

    def _enrich_house(self, house: dict[str, Any]) -> dict[str, Any]:
        panel_ids = {p["id_painel"] for p in self._panels.values() if p["id_casa"] == house["id_casa"]}
        total_kwh = sum(
            float(r["energia_kwh"])
            for r in self._readings.values()
            if r["id_painel"] in panel_ids
        )
        out = copy.deepcopy(house)
        out["qtd_paineis"] = len(panel_ids)
        out["energia_total_kwh"] = round(total_kwh, 4)
        return out

    def _enrich_panel(self, panel: dict[str, Any]) -> dict[str, Any]:
        house = self._houses[panel["id_casa"]]
        model = self._models[panel["id_modelo"]]
        total_kwh = sum(
            float(r["energia_kwh"])
            for r in self._readings.values()
            if r["id_painel"] == panel["id_painel"]
        )
        open_alerts = sum(
            1
            for a in self._alerts.values()
            if a["id_painel"] == panel["id_painel"] and not a["resolvido"]
        )
        return {
            "id_painel": panel["id_painel"],
            "id_casa": panel["id_casa"],
            "nome_casa": house["nome"],
            "id_modelo": panel["id_modelo"],
            "marca": model["marca"],
            "nome_modelo": model["nome_modelo"],
            "potencia_max_w": model["potencia_max_w"],
            "eficiencia_pct": model["eficiencia_pct"],
            "numero_serie": panel["numero_serie"],
            "data_instalacao": panel["data_instalacao"],
            "status": panel["status"],
            "energia_total_kwh": round(total_kwh, 4),
            "alertas_abertos": open_alerts,
        }

    def check_connection(self) -> bool:
        return True

    # --- Usuários ---

    def get_user_by_cpf(self, cpf: str) -> dict[str, Any] | None:
        with self._lock:
            u = self._users.get(cpf)
            return copy.deepcopy(u) if u else None

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        with self._lock:
            target = email.lower()
            for u in self._users.values():
                if u["email"].lower() == target:
                    return copy.deepcopy(u)
            return None

    def create_user(self, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            if data["cpf"] in self._users:
                raise ConflictError("Este CPF já está cadastrado.")
            email_lower = data["email"].lower()
            if any(u["email"].lower() == email_lower for u in self._users.values()):
                raise ConflictError("Este e-mail já está cadastrado.")

            user = {
                "cpf": data["cpf"],
                "nome": data["nome"],
                "data_nascimento": data["data_nascimento"],
                "email": email_lower,
                "senha_hash": data["senha_hash"],
                "telefone": data["telefone"],
                "logradouro": data["logradouro"],
                "numero": data["numero"],
                "complemento": data.get("complemento"),
                "bairro": data["bairro"],
                "cidade": data["cidade"],
                "uf": data["uf"],
                "cep": data["cep"],
                "ativo": True,
                "criado_em": datetime.now(),
            }
            self._users[data["cpf"]] = user
            return copy.deepcopy(user)

    def update_user(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            user = self._users.get(cpf)
            if not user:
                raise NotFoundError("Usuário não encontrado.")
            for field in (
                "nome",
                "data_nascimento",
                "telefone",
                "logradouro",
                "numero",
                "complemento",
                "bairro",
                "cidade",
                "uf",
                "cep",
            ):
                user[field] = data.get(field)
            return copy.deepcopy(user)

    def deactivate_user(self, cpf: str) -> None:
        with self._lock:
            user = self._users.get(cpf)
            if not user:
                raise NotFoundError("Usuário não encontrado.")
            user["ativo"] = False

    # --- Casas ---

    def list_houses(self, cpf: str) -> list[dict[str, Any]]:
        with self._lock:
            houses = [
                self._enrich_house(h)
                for h in self._houses.values()
                if h["cpf_proprietario"] == cpf
            ]
            houses.sort(key=lambda x: (x["criado_em"], x["id_casa"]), reverse=True)
            return houses

    def get_house(self, id_casa: int, cpf: str) -> dict[str, Any] | None:
        with self._lock:
            house = self._houses.get(id_casa)
            if not house or house["cpf_proprietario"] != cpf:
                return None
            return self._enrich_house(house)

    def create_house(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            hid = self._next_house_id
            self._next_house_id += 1
            house = {
                "id_casa": hid,
                "cpf_proprietario": cpf,
                "nome": data.get("nome"),
                "logradouro": data["logradouro"],
                "numero": data["numero"],
                "complemento": data.get("complemento"),
                "bairro": data["bairro"],
                "cidade": data["cidade"],
                "uf": data["uf"],
                "cep": data["cep"],
                "criado_em": datetime.now(),
            }
            self._houses[hid] = house
            return self._enrich_house(house)

    def update_house(self, id_casa: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            house = self._houses.get(id_casa)
            if not house or house["cpf_proprietario"] != cpf:
                raise NotFoundError("Casa não encontrada.")
            for field in (
                "nome",
                "logradouro",
                "numero",
                "complemento",
                "bairro",
                "cidade",
                "uf",
                "cep",
            ):
                house[field] = data.get(field)
            return self._enrich_house(house)

    def delete_house(self, id_casa: int, cpf: str) -> None:
        with self._lock:
            house = self._houses.get(id_casa)
            if not house or house["cpf_proprietario"] != cpf:
                raise NotFoundError("Casa não encontrada.")
            if any(p["id_casa"] == id_casa for p in self._panels.values()):
                raise ConflictError(
                    "Não é possível excluir esta casa porque existem painéis vinculados a ela (ON DELETE RESTRICT)."
                )
            del self._houses[id_casa]

    # --- Modelos de Painéis ---

    def list_panel_models(self) -> list[dict[str, Any]]:
        with self._lock:
            models = [copy.deepcopy(m) for m in self._models.values()]
            models.sort(key=lambda x: (x["marca"].lower(), x["nome_modelo"].lower()))
            return models

    def create_panel_model(self, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            marca = data["marca"].strip()
            nome_modelo = data["nome_modelo"].strip()
            for m in self._models.values():
                if m["marca"].lower() == marca.lower() and m["nome_modelo"].lower() == nome_modelo.lower():
                    raise ConflictError("Este modelo de painel (marca + nome) já está cadastrado.")
            mid = self._next_model_id
            self._next_model_id += 1
            model = {
                "id_modelo": mid,
                "marca": marca,
                "nome_modelo": nome_modelo,
                "potencia_max_w": data["potencia_max_w"],
                "eficiencia_pct": data.get("eficiencia_pct"),
            }
            self._models[mid] = model
            return copy.deepcopy(model)

    # --- Painéis ---

    def list_panels(self, cpf: str, id_casa: int | None = None) -> list[dict[str, Any]]:
        with self._lock:
            user_house_ids = {
                h["id_casa"] for h in self._houses.values() if h["cpf_proprietario"] == cpf
            }
            panels = [
                self._enrich_panel(p)
                for p in self._panels.values()
                if p["id_casa"] in user_house_ids
                and (id_casa is None or p["id_casa"] == id_casa)
            ]
            panels.sort(key=lambda x: (x["id_casa"], x["id_painel"]))
            return panels

    def get_panel(self, id_painel: int, cpf: str) -> dict[str, Any] | None:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel:
                return None
            house = self._houses.get(panel["id_casa"])
            if not house or house["cpf_proprietario"] != cpf:
                return None
            return self._enrich_panel(panel)

    def create_panel(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            house = self._houses.get(data["id_casa"])
            if not house or house["cpf_proprietario"] != cpf:
                raise NotFoundError("Casa informada não foi encontrada ou não pertence a você.")
            if data["id_modelo"] not in self._models:
                raise ValidationDomainError("Modelo de painel informado não existe.")
            if any(p["numero_serie"] == data["numero_serie"] for p in self._panels.values()):
                raise ConflictError("Já existe um painel cadastrado com este número de série.")

            pid = self._next_panel_id
            self._next_panel_id += 1
            panel = {
                "id_painel": pid,
                "id_casa": data["id_casa"],
                "id_modelo": data["id_modelo"],
                "numero_serie": data["numero_serie"],
                "data_instalacao": data["data_instalacao"],
                "status": data["status"],
            }
            self._panels[pid] = panel
            return self._enrich_panel(panel)

    def update_panel(self, id_painel: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel or self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Painel não encontrado.")
            target_house = self._houses.get(data["id_casa"])
            if not target_house or target_house["cpf_proprietario"] != cpf:
                raise NotFoundError("Casa de destino não encontrada ou não pertence a você.")
            if data["id_modelo"] not in self._models:
                raise ValidationDomainError("Modelo de painel informado não existe.")
            for other in self._panels.values():
                if other["id_painel"] != id_painel and other["numero_serie"] == data["numero_serie"]:
                    raise ConflictError("Já existe um painel cadastrado com este número de série.")

            panel["id_casa"] = data["id_casa"]
            panel["id_modelo"] = data["id_modelo"]
            panel["numero_serie"] = data["numero_serie"]
            panel["data_instalacao"] = data["data_instalacao"]
            panel["status"] = data["status"]
            return self._enrich_panel(panel)

    def delete_panel(self, id_painel: int, cpf: str) -> None:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel or self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Painel não encontrado.")
            has_readings = any(r["id_painel"] == id_painel for r in self._readings.values())
            has_alerts = any(a["id_painel"] == id_painel for a in self._alerts.values())
            if has_readings or has_alerts:
                raise ConflictError(
                    "Não é possível excluir este painel porque existem leituras ou alertas vinculados a ele. "
                    "Altere o status do painel para 'inativo'."
                )
            del self._panels[id_painel]

    # --- Dashboard (sp_resumo_energia_casa simulation) ---

    def get_dashboard_summary(self, cpf: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        with self._lock:
            houses = [h for h in self._houses.values() if h["cpf_proprietario"] == cpf]
            houses.sort(key=lambda x: x["id_casa"])

            casas_rs: list[dict[str, Any]] = []
            paineis_rs: list[dict[str, Any]] = []

            for house in houses:
                house_panels = [p for p in self._panels.values() if p["id_casa"] == house["id_casa"]]
                house_panels.sort(key=lambda x: x["id_painel"])
                house_total = 0.0

                for panel in house_panels:
                    panel_total = round(
                        sum(
                            float(r["energia_kwh"])
                            for r in self._readings.values()
                            if r["id_painel"] == panel["id_painel"]
                        ),
                        4,
                    )
                    house_total += panel_total
                    paineis_rs.append(
                        {
                            "id_casa": house["id_casa"],
                            "id_painel": panel["id_painel"],
                            "numero_serie": panel["numero_serie"],
                            "energia_total_painel": panel_total,
                        }
                    )

                casas_rs.append(
                    {
                        "id_casa": house["id_casa"],
                        "nome": house["nome"],
                        "qtd_paineis": len(house_panels),
                        "energia_total_casa": round(house_total, 4),
                    }
                )

            return casas_rs, paineis_rs

    # --- Leituras (Views simulation) ---

    def get_hourly_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        limit: int = 168,
    ) -> list[dict[str, Any]]:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel or self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Painel não encontrado.")
            house = self._houses[panel["id_casa"]]
            model = self._models[panel["id_modelo"]]

            rows = []
            for r in self._readings.values():
                if r["id_painel"] != id_painel:
                    continue
                if data_inicio is not None and r["registrado_em"] < data_inicio:
                    continue
                if data_fim is not None and r["registrado_em"] > data_fim:
                    continue
                rows.append(
                    {
                        "id_leitura": r["id_leitura"],
                        "id_painel": id_painel,
                        "numero_serie": panel["numero_serie"],
                        "id_casa": house["id_casa"],
                        "nome_casa": house["nome"],
                        "registrado_em": r["registrado_em"],
                        "energia_kwh": float(r["energia_kwh"]),
                        "potencia_max_w": model["potencia_max_w"],
                    }
                )

            rows.sort(key=lambda x: x["registrado_em"], reverse=True)
            rows = rows[:limit]
            rows.sort(key=lambda x: x["registrado_em"])
            return rows

    def get_daily_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        limit: int = 60,
    ) -> list[dict[str, Any]]:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel or self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Painel não encontrado.")
            house = self._houses[panel["id_casa"]]

            grouped: dict[date, dict[str, Any]] = {}
            for r in self._readings.values():
                if r["id_painel"] != id_painel:
                    continue
                d = r["registrado_em"].date()
                if data_inicio is not None and d < data_inicio:
                    continue
                if data_fim is not None and d > data_fim:
                    continue
                bucket = grouped.setdefault(
                    d,
                    {
                        "id_painel": id_painel,
                        "numero_serie": panel["numero_serie"],
                        "id_casa": house["id_casa"],
                        "nome_casa": house["nome"],
                        "data_leitura": d,
                        "total_leituras": 0,
                        "energia_total_kwh": Decimal("0"),
                    },
                )
                bucket["total_leituras"] += 1
                bucket["energia_total_kwh"] += r["energia_kwh"]

            rows = [
                {
                    **item,
                    "energia_total_kwh": round(float(item["energia_total_kwh"]), 4),
                }
                for item in grouped.values()
            ]
            rows.sort(key=lambda x: x["data_leitura"], reverse=True)
            rows = rows[:limit]
            rows.sort(key=lambda x: x["data_leitura"])
            return rows

    def insert_reading(
        self,
        id_painel: int,
        cpf: str,
        registrado_em: datetime,
        energia_kwh: Decimal,
    ) -> dict[str, Any]:
        with self._lock:
            panel = self._panels.get(id_painel)
            if not panel or self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Painel não encontrado.")
            reading, triggered = self._insert_reading_internal(id_painel, registrado_em, energia_kwh)
            return {
                "id_leitura": reading["id_leitura"],
                "id_painel": id_painel,
                "registrado_em": reading["registrado_em"],
                "energia_kwh": float(reading["energia_kwh"]),
                "alertas_gerados": triggered,
            }

    # --- Alertas ---

    def list_alerts(
        self,
        cpf: str,
        resolvido: bool | None = None,
        id_painel: int | None = None,
        tipo_alerta: str | None = None,
    ) -> list[dict[str, Any]]:
        with self._lock:
            user_panel_ids = {
                p["id_painel"]
                for p in self._panels.values()
                if self._houses[p["id_casa"]]["cpf_proprietario"] == cpf
            }
            out = []
            for a in self._alerts.values():
                if a["id_painel"] not in user_panel_ids:
                    continue
                if resolvido is not None and a["resolvido"] != resolvido:
                    continue
                if id_painel is not None and a["id_painel"] != id_painel:
                    continue
                if tipo_alerta is not None and a["tipo_alerta"] != tipo_alerta:
                    continue
                out.append(self._enrich_alert(a))

            out.sort(key=lambda x: (x["resolvido"], -x["criado_em"].timestamp(), -x["id_alerta"]))
            return out

    def resolve_alert(self, id_alerta: int, cpf: str) -> dict[str, Any]:
        with self._lock:
            alert = self._alerts.get(id_alerta)
            if not alert:
                raise NotFoundError("Alerta não encontrado.")
            panel = self._panels[alert["id_painel"]]
            if self._houses[panel["id_casa"]]["cpf_proprietario"] != cpf:
                raise NotFoundError("Alerta não encontrado.")

            alert["resolvido"] = True
            if alert["resolvido_em"] is None:
                alert["resolvido_em"] = datetime.now()
            return self._enrich_alert(alert)

    # --- Auditoria ---

    def log_audit(
        self,
        cpf_usuario: str,
        acao: str,
        tabela_alvo: str | None = None,
        id_alvo: str | None = None,
        detalhes: dict[str, Any] | str | None = None,
        endereco_ip: str | None = None,
    ) -> None:
        with self._lock:
            details_text = (
                json.dumps(detalhes, ensure_ascii=False, default=str)
                if isinstance(detalhes, dict)
                else detalhes
            )
            lid = self._next_log_id
            self._next_log_id += 1
            self._audit_logs.append(
                {
                    "id_log": lid,
                    "cpf_usuario": cpf_usuario,
                    "acao": acao,
                    "tabela_alvo": tabela_alvo,
                    "id_alvo": id_alvo,
                    "detalhes": details_text,
                    "endereco_ip": endereco_ip,
                    "criado_em": datetime.now(),
                }
            )

    def list_audit_logs(
        self,
        cpf: str,
        acao: str | None = None,
        tabela_alvo: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = [
                copy.deepcopy(log)
                for log in self._audit_logs
                if log["cpf_usuario"] == cpf
                and (not acao or log["acao"] == acao)
                and (not tabela_alvo or log["tabela_alvo"] == tabela_alvo)
            ]
            rows.sort(key=lambda x: (x["criado_em"], x["id_log"]), reverse=True)
            return rows[:limit]
