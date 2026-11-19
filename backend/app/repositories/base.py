from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Any


class DomainError(Exception):
    """Base domain error raised by repositories."""


class ConflictError(DomainError):
    """Raised on UNIQUE violations or ON DELETE RESTRICT constraints."""


class NotFoundError(DomainError):
    """Raised when a resource does not exist or does not belong to the user."""


class ValidationDomainError(DomainError):
    """Raised when a FK or domain constraint fails."""


class HelioSenseRepository(ABC):
    @abstractmethod
    def check_connection(self) -> bool:
        """Verify whether the underlying data store is reachable."""

    # --- Usuários ---
    @abstractmethod
    def get_user_by_cpf(self, cpf: str) -> dict[str, Any] | None:
        pass

    @abstractmethod
    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        pass

    @abstractmethod
    def create_user(self, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def update_user(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def deactivate_user(self, cpf: str) -> None:
        pass

    # --- Casas ---
    @abstractmethod
    def list_houses(self, cpf: str) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def get_house(self, id_casa: int, cpf: str) -> dict[str, Any] | None:
        pass

    @abstractmethod
    def create_house(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def update_house(self, id_casa: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def delete_house(self, id_casa: int, cpf: str) -> None:
        pass

    # --- Modelos de Painéis ---
    @abstractmethod
    def list_panel_models(self) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def create_panel_model(self, data: dict[str, Any]) -> dict[str, Any]:
        pass

    # --- Painéis ---
    @abstractmethod
    def list_panels(self, cpf: str, id_casa: int | None = None) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def get_panel(self, id_painel: int, cpf: str) -> dict[str, Any] | None:
        pass

    @abstractmethod
    def create_panel(self, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def update_panel(self, id_painel: int, cpf: str, data: dict[str, Any]) -> dict[str, Any]:
        pass

    @abstractmethod
    def delete_panel(self, id_painel: int, cpf: str) -> None:
        pass

    # --- Dashboard (Stored Procedure sp_resumo_energia_casa) ---
    @abstractmethod
    def get_dashboard_summary(self, cpf: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Returns (casas_result_set, paineis_result_set) from sp_resumo_energia_casa."""

    # --- Leituras de Energia (Views + Insert) ---
    @abstractmethod
    def get_hourly_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
        limit: int = 168,
    ) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def get_daily_readings(
        self,
        id_painel: int,
        cpf: str,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        limit: int = 60,
    ) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def insert_reading(
        self,
        id_painel: int,
        cpf: str,
        registrado_em: datetime,
        energia_kwh: Decimal,
    ) -> dict[str, Any]:
        """Inserts a reading and returns the reading + any alerts triggered by DB/mock."""

    # --- Alertas ---
    @abstractmethod
    def list_alerts(
        self,
        cpf: str,
        resolvido: bool | None = None,
        id_painel: int | None = None,
        tipo_alerta: str | None = None,
    ) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    def resolve_alert(self, id_alerta: int, cpf: str) -> dict[str, Any]:
        pass

    # --- Auditoria ---
    @abstractmethod
    def log_audit(
        self,
        cpf_usuario: str,
        acao: str,
        tabela_alvo: str | None = None,
        id_alvo: str | None = None,
        detalhes: dict[str, Any] | str | None = None,
        endereco_ip: str | None = None,
    ) -> None:
        pass

    @abstractmethod
    def list_audit_logs(
        self,
        cpf: str,
        acao: str | None = None,
        tabela_alvo: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        pass
