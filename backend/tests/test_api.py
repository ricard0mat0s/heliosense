from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.repositories import reset_repository


@pytest.fixture(autouse=True)
def fresh_mock_repo() -> None:
    reset_repository()


client = TestClient(app)


def _login_demo() -> dict[str, str]:
    resp = client.post(
        "/api/auth/login",
        json={"email": "demo@heliosense.com.br", "senha": "HelioSense@2026"},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health_and_demo_login() -> None:
    health = client.get("/api/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["data_source"] == "mock"
    assert body["database_connected"] is True

    headers = _login_demo()
    me = client.get("/api/usuarios/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["cpf"] == "12345678901"


def test_dashboard_stored_procedure_and_views() -> None:
    headers = _login_demo()

    dash = client.get("/api/dashboard/resumo", headers=headers)
    assert dash.status_code == 200
    data = dash.json()
    assert data["total_casas"] == 2
    assert data["total_paineis"] == 5
    assert data["energia_total_kwh"] > 0
    assert len(data["casas"]) == 2
    assert len(data["paineis"]) == 5

    # Hourly and daily views for panel 1
    hourly = client.get("/api/paineis/1/leituras/horaria?limit=24", headers=headers)
    assert hourly.status_code == 200
    assert len(hourly.json()) > 0
    assert "energia_kwh" in hourly.json()[0]

    daily = client.get("/api/paineis/1/leituras/diaria?limit=14", headers=headers)
    assert daily.status_code == 200
    assert len(daily.json()) >= 6
    assert "energia_total_kwh" in daily.json()[0]


def test_house_panel_crud_and_on_delete_restrict() -> None:
    headers = _login_demo()

    # Attempting to delete house 1 (which has panels) must fail with 409 ON DELETE RESTRICT
    blocked = client.delete("/api/casas/1", headers=headers)
    assert blocked.status_code == 409
    assert "ON DELETE RESTRICT" in blocked.json()["detail"]

    # Create a new house
    created_house = client.post(
        "/api/casas",
        headers=headers,
        json={
            "nome": "Casa de Testes",
            "logradouro": "Rua do Sol",
            "numero": "100",
            "bairro": "Centro",
            "cidade": "Montes Claros",
            "uf": "MG",
            "cep": "39400-001",
        },
    )
    assert created_house.status_code == 201
    house_id = created_house.json()["id_casa"]

    # Create a new panel model and attach a panel to the new house
    created_model = client.post(
        "/api/modelos-paineis",
        headers=headers,
        json={
            "marca": "LONGi",
            "nome_modelo": "Hi-MO 6 600W",
            "potencia_max_w": 600,
            "eficiencia_pct": 22.8,
        },
    )
    assert created_model.status_code == 201
    model_id = created_model.json()["id_modelo"]

    created_panel = client.post(
        "/api/paineis",
        headers=headers,
        json={
            "id_casa": house_id,
            "id_modelo": model_id,
            "numero_serie": "LG-600-TEST-01",
            "data_instalacao": "2026-11-01",
            "status": "ativo",
        },
    )
    assert created_panel.status_code == 201
    panel_id = created_panel.json()["id_painel"]

    # Deleting the house is now blocked because of the panel
    assert client.delete(f"/api/casas/{house_id}", headers=headers).status_code == 409

    # Deleting the fresh panel (no readings yet) succeeds, then deleting the house succeeds
    assert client.delete(f"/api/paineis/{panel_id}", headers=headers).status_code == 204
    assert client.delete(f"/api/casas/{house_id}", headers=headers).status_code == 204


def test_reading_triggers_duplicate_409_and_alert_resolution() -> None:
    headers = _login_demo()

    # 1. Insert daytime zero reading -> triggers ZERO_DIURNO
    r1 = client.post(
        "/api/paineis/1/leituras",
        headers=headers,
        json={"registrado_em": "2026-12-01T13:00:00", "energia_kwh": 0},
    )
    assert r1.status_code == 201
    alerts1 = r1.json()["alertas_gerados"]
    assert len(alerts1) == 1
    assert alerts1[0]["tipo_alerta"] == "ZERO_DIURNO"

    # 2. Duplicate hour on same panel -> 409 Conflict
    dup = client.post(
        "/api/paineis/1/leituras",
        headers=headers,
        json={"registrado_em": "2026-12-01T13:35:00", "energia_kwh": 0.3},
    )
    assert dup.status_code == 409

    # 3. Insert reading exceeding 550W (0.55 kWh) -> triggers ACIMA_CAPACIDADE
    r2 = client.post(
        "/api/paineis/1/leituras",
        headers=headers,
        json={"registrado_em": "2026-12-01T14:00:00", "energia_kwh": 0.95},
    )
    assert r2.status_code == 201
    alerts2 = r2.json()["alertas_gerados"]
    assert len(alerts2) == 1
    assert alerts2[0]["tipo_alerta"] == "ACIMA_CAPACIDADE"

    # 4. Resolve alert and verify audit trail recorded everything
    alert_id = alerts2[0]["id_alerta"]
    resolved = client.patch(f"/api/alertas/{alert_id}/resolver", headers=headers)
    assert resolved.status_code == 200
    assert resolved.json()["resolvido"] is True
    assert resolved.json()["resolvido_em"] is not None

    logs = client.get("/api/auditoria?limit=20", headers=headers)
    assert logs.status_code == 200
    actions = {item["acao"] for item in logs.json()}
    assert "LOGIN" in actions
    assert "REGISTRAR_LEITURA" in actions
    assert "RESOLVER_ALERTA" in actions


def test_register_and_soft_deactivate_account() -> None:
    reg = client.post(
        "/api/auth/register",
        json={
            "cpf": "987.654.321-00",
            "nome": "Carlos Mendes",
            "data_nascimento": "1988-09-20",
            "email": "carlos@heliosense.com.br",
            "senha": "SenhaSegura123",
            "telefone": "(38) 99111-2233",
            "logradouro": "Rua das Palmeiras",
            "numero": "42",
            "bairro": "Todos os Santos",
            "cidade": "Montes Claros",
            "uf": "mg",
            "cep": "39400-120",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert reg.json()["usuario"]["cpf"] == "98765432100"
    assert reg.json()["usuario"]["uf"] == "MG"

    # Soft delete (ativo = FALSE)
    deact = client.post("/api/usuarios/me/desativar", headers=headers)
    assert deact.status_code == 200

    # Subsequent API calls and logins are blocked with 403
    assert client.get("/api/usuarios/me", headers=headers).status_code == 403
    login_again = client.post(
        "/api/auth/login",
        json={"email": "carlos@heliosense.com.br", "senha": "SenhaSegura123"},
    )
    assert login_again.status_code == 403


def test_simulate_day_and_user_isolation() -> None:
    headers = _login_demo()

    # Simulate a full 24h day with a zero_diurno anomaly on panel 1
    sim1 = client.post(
        "/api/paineis/1/leituras/simular-dia",
        headers=headers,
        json={"data": "2026-12-15", "incluir_anomalia": "zero_diurno"},
    )
    assert sim1.status_code == 201
    body1 = sim1.json()
    assert body1["leituras_inseridas"] == 24
    assert body1["leituras_ignoradas"] == 0
    assert any(a["tipo_alerta"] == "ZERO_DIURNO" for a in body1["alertas_gerados"])

    # Re-running the same day skips all 24 existing hourly slots gracefully
    sim2 = client.post(
        "/api/paineis/1/leituras/simular-dia",
        headers=headers,
        json={"data": "2026-12-15", "incluir_anomalia": "nenhuma"},
    )
    assert sim2.status_code == 201
    assert sim2.json()["leituras_inseridas"] == 0
    assert sim2.json()["leituras_ignoradas"] == 24

    # Another registered user cannot access demo user's house or panel
    other = client.post(
        "/api/auth/register",
        json={
            "cpf": "11122233344",
            "nome": "Joana Rocha",
            "data_nascimento": "1995-03-10",
            "email": "joana@heliosense.com.br",
            "senha": "SenhaSegura123",
            "telefone": "(38) 99222-3344",
            "logradouro": "Rua B",
            "numero": "20",
            "bairro": "Centro",
            "cidade": "Montes Claros",
            "uf": "MG",
            "cep": "39400000",
        },
    )
    assert other.status_code == 201
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    assert client.get("/api/casas/1", headers=other_headers).status_code == 404
    assert client.get("/api/paineis/1", headers=other_headers).status_code == 404
    assert client.get("/api/casas", headers=other_headers).json() == []

