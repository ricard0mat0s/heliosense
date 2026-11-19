from app.config import get_settings
from app.repositories.base import HelioSenseRepository
from app.repositories.mock_repo import MockRepository
from app.repositories.mysql_repo import MySQLRepository

_repository_instance: HelioSenseRepository | None = None


def get_repository() -> HelioSenseRepository:
    global _repository_instance
    if _repository_instance is None:
        settings = get_settings()
        if settings.data_source == "mysql":
            _repository_instance = MySQLRepository(settings)
        else:
            _repository_instance = MockRepository()
    return _repository_instance


def reset_repository() -> None:
    """Resets the singleton repository (useful in automated tests)."""
    global _repository_instance
    _repository_instance = None
