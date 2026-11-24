export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum1 = 0;
  for (let i = 0; i < 9; i += 1) {
    sum1 += Number(digits[i]) * (10 - i);
  }
  let check1 = (sum1 * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (Number(digits[9]) !== check1) {
    return false;
  }

  let sum2 = 0;
  for (let i = 0; i < 10; i += 1) {
    sum2 += Number(digits[i]) * (11 - i);
  }
  let check2 = (sum2 * 10) % 11;
  if (check2 === 10) check2 = 0;
  return Number(digits[10]) === check2;
}

export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatKwh(value: number, decimals = 2): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kWh`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortHour(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export function formatShortDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return iso;
}

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Não foi possível completar a solicitação. Tente novamente em instantes.";
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: "Acesso à conta",
  LOGIN_FALHA: "Tentativa de acesso falhou",
  LOGOUT: "Saída da conta",
  CADASTRO: "Criação de conta",
  ATUALIZAR_PERFIL: "Atualização de perfil",
  CRIAR_CASA: "Nova residência",
  ATUALIZAR_CASA: "Edição de residência",
  EXCLUIR_CASA: "Exclusão de residência",
  CRIAR_MODELO_PAINEL: "Novo modelo de painel",
  CRIAR_PAINEL: "Novo painel solar",
  ATUALIZAR_PAINEL: "Edição de painel solar",
  EXCLUIR_PAINEL: "Exclusão de painel solar",
  REGISTRAR_LEITURA: "Registro de leitura",
  SIMULAR_CURVA_24H: "Simulação diária (24h)",
  RESOLVER_ALERTA: "Alerta resolvido",
  DESATIVAR_CONTA: "Desativação de conta",
};

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  usuarios: "Conta e perfil",
  casas: "Residências",
  modelos_paineis: "Modelos de painel",
  paineis: "Painéis solares",
  leituras_energia: "Leituras de energia",
  alertas: "Alertas",
};

const DETAIL_KEY_LABELS: Record<string, string> = {
  email: "E-mail",
  nome: "Nome",
  cidade: "Cidade",
  numero_serie: "Série",
  status: "Status",
  energia_kwh: "Energia (kWh)",
  registrado_em: "Horário",
  data: "Data",
  anomalia: "Anomalia",
  inseridas: "Inseridas",
  ignoradas: "Ignoradas",
  alertas_gerados: "Alertas",
  marca: "Marca",
  nome_modelo: "Modelo",
  potencia_max_w: "Potência (W)",
  motivo: "Motivo",
  id_painel: "Painel",
  id_casa: "Residência",
  id_alerta: "Alerta",
  id_leitura: "Leitura",
  tipo_alerta: "Tipo",
  resolvido: "Resolvido",
};

const DETAIL_VALUE_LABELS: Record<string, string> = {
  ZERO_DIURNO: "Zero diurno",
  ACIMA_CAPACIDADE: "Acima da capacidade",
  zero_diurno: "Zero diurno",
  acima_capacidade: "Acima da capacidade",
  nenhuma: "Nenhuma",
  ativo: "Ativo",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

function formatDetailValue(key: string, value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "string") {
    if (DETAIL_VALUE_LABELS[value]) return DETAIL_VALUE_LABELS[value];
    return value;
  }
  if (typeof value === "number" && (key === "id_painel" || key === "id_casa" || key === "id_alerta" || key === "id_leitura")) {
    return `#${value}`;
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

export function formatAuditAction(acao: string): string {
  return AUDIT_ACTION_LABELS[acao] ?? acao.replace(/_/g, " ").toLowerCase();
}

export function formatAuditTarget(tabela: string | null | undefined): string {
  if (!tabela) return "Geral";
  return AUDIT_TARGET_LABELS[tabela] ?? tabela;
}

export function formatAuditDetails(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => {
          const label = DETAIL_KEY_LABELS[k] ?? k.replace(/_/g, " ");
          return `${label}: ${formatDetailValue(k, v)}`;
        });
      if (entries.length > 0) return entries.join(" · ");
    }
  } catch {
    // Fall back to plain string when not JSON
  }
  return raw;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "HS";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
