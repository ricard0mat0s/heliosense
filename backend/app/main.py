from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.repositories import get_repository
from app.repositories.base import ConflictError, NotFoundError, ValidationDomainError
from app.routers import (
    alerts,
    audit_logs,
    auth,
    dashboard,
    houses,
    panel_models,
    panels,
    readings,
    users,
)
from app.schemas import HealthOut

settings = get_settings()

app = FastAPI(
    title="HelioSense API",
    description=(
        "API REST para gestão residencial de energia solar (Banco de Dados II — Unimontes). "
        "Suporta modo preview em memória (`DATA_SOURCE=mock`) e integração direta com MySQL (`DATA_SOURCE=mysql`)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ConflictError)
async def conflict_exception_handler(_request: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})


@app.exception_handler(NotFoundError)
async def not_found_exception_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})


@app.exception_handler(ValidationDomainError)
async def domain_validation_handler(_request: Request, exc: ValidationDomainError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


@app.get("/api/health", response_model=HealthOut, tags=["Sistema"])
def health_check() -> HealthOut:
    current_settings = get_settings()
    repo = get_repository()
    return HealthOut(
        status="ok",
        data_source=current_settings.data_source,
        database_connected=repo.check_connection(),
    )


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dashboard.router)
app.include_router(houses.router)
app.include_router(panel_models.router)
app.include_router(panels.router)
app.include_router(readings.router)
app.include_router(alerts.router)
app.include_router(audit_logs.router)
