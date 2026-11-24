import re
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

UF_VALIDAS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO",
}

StatusPainel = Literal["ativo", "manutencao", "inativo"]
TipoAlerta = Literal["ZERO_DIURNO", "ACIMA_CAPACIDADE"]


def _only_digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def is_valid_cpf(value: str) -> bool:
    """Validate a Brazilian CPF using the official Receita Federal check-digit algorithm."""
    digits = _only_digits(value)
    if len(digits) != 11 or len(set(digits)) == 1:
        return False

    nums = [int(d) for d in digits]

    total_1 = sum(num * weight for num, weight in zip(nums[:9], range(10, 1, -1)))
    check_1 = (total_1 * 10) % 11
    if check_1 == 10:
        check_1 = 0
    if nums[9] != check_1:
        return False

    total_2 = sum(num * weight for num, weight in zip(nums[:10], range(11, 1, -1)))
    check_2 = (total_2 * 10) % 11
    if check_2 == 10:
        check_2 = 0
    return nums[10] == check_2


class HealthOut(BaseModel):
    status: str
    data_source: Literal["mock", "mysql"]
    database_connected: bool


# --- Auth & Usuários ---


class UsuarioRegister(BaseModel):
    cpf: str = Field(..., min_length=11, max_length=14)
    nome: str = Field(..., min_length=2, max_length=120)
    data_nascimento: date
    email: EmailStr
    senha: str = Field(..., min_length=6, max_length=128)
    telefone: str = Field(..., min_length=8, max_length=20)
    logradouro: str = Field(..., min_length=2, max_length=150)
    numero: str = Field(..., min_length=1, max_length=10)
    complemento: str | None = Field(default=None, max_length=60)
    bairro: str = Field(..., min_length=2, max_length=80)
    cidade: str = Field(..., min_length=2, max_length=80)
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., min_length=8, max_length=9)

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str) -> str:
        digits = _only_digits(v)
        if len(digits) != 11:
            raise ValueError("CPF deve conter exatamente 11 dígitos.")
        if not is_valid_cpf(digits):
            raise ValueError("CPF inválido. Verifique os números informados.")
        return digits

    @field_validator("cep")
    @classmethod
    def validate_cep(cls, v: str) -> str:
        digits = _only_digits(v)
        if len(digits) != 8:
            raise ValueError("CEP deve conter exatamente 8 dígitos.")
        return digits

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v: str) -> str:
        uf = v.strip().upper()
        if uf not in UF_VALIDAS:
            raise ValueError("UF inválida.")
        return uf

    @field_validator("complemento")
    @classmethod
    def empty_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str = Field(..., min_length=1, max_length=128)


class UsuarioUpdate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=120)
    data_nascimento: date
    telefone: str = Field(..., min_length=8, max_length=20)
    logradouro: str = Field(..., min_length=2, max_length=150)
    numero: str = Field(..., min_length=1, max_length=10)
    complemento: str | None = Field(default=None, max_length=60)
    bairro: str = Field(..., min_length=2, max_length=80)
    cidade: str = Field(..., min_length=2, max_length=80)
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., min_length=8, max_length=9)

    @field_validator("cep")
    @classmethod
    def validate_cep(cls, v: str) -> str:
        digits = _only_digits(v)
        if len(digits) != 8:
            raise ValueError("CEP deve conter exatamente 8 dígitos.")
        return digits

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v: str) -> str:
        uf = v.strip().upper()
        if uf not in UF_VALIDAS:
            raise ValueError("UF inválida.")
        return uf

    @field_validator("complemento")
    @classmethod
    def empty_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class UsuarioOut(BaseModel):
    cpf: str
    nome: str
    data_nascimento: date
    email: str
    telefone: str
    logradouro: str
    numero: str
    complemento: str | None
    bairro: str
    cidade: str
    uf: str
    cep: str
    ativo: bool
    criado_em: datetime


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


# --- Casas ---


class CasaBase(BaseModel):
    nome: str | None = Field(default=None, max_length=80)
    logradouro: str = Field(..., min_length=2, max_length=150)
    numero: str = Field(..., min_length=1, max_length=10)
    complemento: str | None = Field(default=None, max_length=60)
    bairro: str = Field(..., min_length=2, max_length=80)
    cidade: str = Field(..., min_length=2, max_length=80)
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., min_length=8, max_length=9)

    @field_validator("cep")
    @classmethod
    def validate_cep(cls, v: str) -> str:
        digits = _only_digits(v)
        if len(digits) != 8:
            raise ValueError("CEP deve conter exatamente 8 dígitos.")
        return digits

    @field_validator("uf")
    @classmethod
    def validate_uf(cls, v: str) -> str:
        uf = v.strip().upper()
        if uf not in UF_VALIDAS:
            raise ValueError("UF inválida.")
        return uf

    @field_validator("nome", "complemento")
    @classmethod
    def empty_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None


class CasaCreate(CasaBase):
    pass


class CasaUpdate(CasaBase):
    pass


class CasaOut(BaseModel):
    id_casa: int
    cpf_proprietario: str
    nome: str | None
    logradouro: str
    numero: str
    complemento: str | None
    bairro: str
    cidade: str
    uf: str
    cep: str
    criado_em: datetime
    qtd_paineis: int = 0
    energia_total_kwh: float = 0.0


# --- Modelos de Painéis ---


class ModeloPainelCreate(BaseModel):
    marca: str = Field(..., min_length=2, max_length=80)
    nome_modelo: str = Field(..., min_length=2, max_length=80)
    potencia_max_w: int = Field(..., gt=0, le=50000)
    eficiencia_pct: float | None = Field(default=None, gt=0, le=100)


class ModeloPainelOut(BaseModel):
    id_modelo: int
    marca: str
    nome_modelo: str
    potencia_max_w: int
    eficiencia_pct: float | None


# --- Painéis ---


class PainelCreate(BaseModel):
    id_casa: int = Field(..., gt=0)
    id_modelo: int = Field(..., gt=0)
    numero_serie: str = Field(..., min_length=3, max_length=60)
    data_instalacao: date
    status: StatusPainel = "ativo"

    @field_validator("numero_serie")
    @classmethod
    def clean_serial(cls, v: str) -> str:
        return v.strip().upper()


class PainelUpdate(BaseModel):
    id_casa: int = Field(..., gt=0)
    id_modelo: int = Field(..., gt=0)
    numero_serie: str = Field(..., min_length=3, max_length=60)
    data_instalacao: date
    status: StatusPainel

    @field_validator("numero_serie")
    @classmethod
    def clean_serial(cls, v: str) -> str:
        return v.strip().upper()


class PainelOut(BaseModel):
    id_painel: int
    id_casa: int
    nome_casa: str | None = None
    id_modelo: int
    marca: str
    nome_modelo: str
    potencia_max_w: int
    eficiencia_pct: float | None
    numero_serie: str
    data_instalacao: date
    status: StatusPainel
    energia_total_kwh: float = 0.0
    alertas_abertos: int = 0


# --- Leituras de Energia & Views ---


class LeituraCreate(BaseModel):
    registrado_em: datetime
    energia_kwh: Decimal = Field(..., ge=Decimal("0"), le=Decimal("999999.9999"))

    @field_validator("registrado_em")
    @classmethod
    def normalize_hour(cls, v: datetime) -> datetime:
        # Remove timezone info to store naive local DATETIME truncated to exact hour
        naive = v.replace(tzinfo=None)
        return naive.replace(minute=0, second=0, microsecond=0)


class SimularDiaCreate(BaseModel):
    data: date
    incluir_anomalia: Literal["nenhuma", "zero_diurno", "acima_capacidade"] = "nenhuma"


class LeituraHorariaOut(BaseModel):
    id_leitura: int
    id_painel: int
    numero_serie: str
    id_casa: int
    nome_casa: str | None
    registrado_em: datetime
    energia_kwh: float
    potencia_max_w: int


class LeituraDiariaOut(BaseModel):
    id_painel: int
    numero_serie: str
    id_casa: int
    nome_casa: str | None
    data_leitura: date
    total_leituras: int
    energia_total_kwh: float


class AlertaOut(BaseModel):
    id_alerta: int
    id_painel: int
    numero_serie: str | None = None
    id_casa: int | None = None
    nome_casa: str | None = None
    id_leitura: int
    tipo_alerta: TipoAlerta
    mensagem: str
    resolvido: bool
    criado_em: datetime
    resolvido_em: datetime | None


class LeituraRegistroOut(BaseModel):
    id_leitura: int
    id_painel: int
    registrado_em: datetime
    energia_kwh: float
    alertas_gerados: list[AlertaOut] = Field(default_factory=list)


class SimularDiaOut(BaseModel):
    leituras_inseridas: int
    leituras_ignoradas: int
    alertas_gerados: list[AlertaOut] = Field(default_factory=list)


# --- Dashboard (Stored Procedure sp_resumo_energia_casa) ---


class ResumoCasaSPOut(BaseModel):
    id_casa: int
    nome: str | None
    qtd_paineis: int
    energia_total_casa: float


class ResumoPainelSPOut(BaseModel):
    id_casa: int
    id_painel: int
    numero_serie: str
    energia_total_painel: float
    status: StatusPainel | None = None
    marca: str | None = None
    nome_modelo: str | None = None
    potencia_max_w: int | None = None
    alertas_abertos: int = 0


class DashboardResumoOut(BaseModel):
    data_source: Literal["mock", "mysql"]
    energia_total_kwh: float
    total_casas: int
    total_paineis: int
    paineis_ativos: int
    alertas_abertos: int
    casas: list[ResumoCasaSPOut]
    paineis: list[ResumoPainelSPOut]


# --- Auditoria ---


class LogAuditoriaOut(BaseModel):
    id_log: int
    cpf_usuario: str
    acao: str
    tabela_alvo: str | None
    id_alvo: str | None
    detalhes: str | None
    endereco_ip: str | None
    criado_em: datetime
