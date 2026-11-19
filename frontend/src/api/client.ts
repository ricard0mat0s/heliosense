import type {
  Alerta,
  AuthTokenResponse,
  Casa,
  CasaPayload,
  DashboardResumo,
  HealthInfo,
  LeituraDiaria,
  LeituraHoraria,
  LeituraRegistroResponse,
  LogAuditoria,
  ModeloPainel,
  ModeloPainelPayload,
  Painel,
  PainelPayload,
  SimularDiaResponse,
  TipoAlerta,
  Usuario,
  UsuarioRegisterPayload,
  UsuarioUpdatePayload,
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "heliosense_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string; loc?: string[] };
        const field = first.loc?.[first.loc.length - 1];
        message = field ? `${field}: ${first.msg ?? "Valor inválido"}` : (first.msg ?? message);
      }
    }
    throw new ApiError(response.status, message);
  }

  return data as T;
}

export const api = {
  health: () => request<HealthInfo>("/api/health"),

  // Auth
  login: (email: string, senha: string) =>
    request<AuthTokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),
  register: (payload: UsuarioRegisterPayload) =>
    request<AuthTokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),

  // Usuário
  getMe: () => request<Usuario>("/api/usuarios/me"),
  updateMe: (payload: UsuarioUpdatePayload) =>
    request<Usuario>("/api/usuarios/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deactivateMe: () => request<{ mensagem: string }>("/api/usuarios/me/desativar", { method: "POST" }),

  // Dashboard (Stored Procedure)
  getDashboardResumo: () => request<DashboardResumo>("/api/dashboard/resumo"),

  // Casas
  listCasas: () => request<Casa[]>("/api/casas"),
  createCasa: (payload: CasaPayload) =>
    request<Casa>("/api/casas", { method: "POST", body: JSON.stringify(payload) }),
  updateCasa: (idCasa: number, payload: CasaPayload) =>
    request<Casa>(`/api/casas/${idCasa}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCasa: (idCasa: number) => request<void>(`/api/casas/${idCasa}`, { method: "DELETE" }),

  // Modelos de Painéis
  listModelos: () => request<ModeloPainel[]>("/api/modelos-paineis"),
  createModelo: (payload: ModeloPainelPayload) =>
    request<ModeloPainel>("/api/modelos-paineis", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Painéis
  listPaineis: (idCasa?: number) => {
    const q = idCasa ? `?id_casa=${idCasa}` : "";
    return request<Painel[]>(`/api/paineis${q}`);
  },
  getPainel: (idPainel: number) => request<Painel>(`/api/paineis/${idPainel}`),
  createPainel: (payload: PainelPayload) =>
    request<Painel>("/api/paineis", { method: "POST", body: JSON.stringify(payload) }),
  updatePainel: (idPainel: number, payload: PainelPayload) =>
    request<Painel>(`/api/paineis/${idPainel}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePainel: (idPainel: number) => request<void>(`/api/paineis/${idPainel}`, { method: "DELETE" }),

  // Leituras (Views + Insert + Simulator)
  getLeiturasHoraria: (idPainel: number, limit = 72) =>
    request<LeituraHoraria[]>(`/api/paineis/${idPainel}/leituras/horaria?limit=${limit}`),
  getLeiturasDiaria: (idPainel: number, limit = 30) =>
    request<LeituraDiaria[]>(`/api/paineis/${idPainel}/leituras/diaria?limit=${limit}`),
  registrarLeitura: (idPainel: number, registrado_em: string, energia_kwh: number) =>
    request<LeituraRegistroResponse>(`/api/paineis/${idPainel}/leituras`, {
      method: "POST",
      body: JSON.stringify({ registrado_em, energia_kwh }),
    }),
  simularDia: (
    idPainel: number,
    data: string,
    incluir_anomalia: "nenhuma" | "zero_diurno" | "acima_capacidade"
  ) =>
    request<SimularDiaResponse>(`/api/paineis/${idPainel}/leituras/simular-dia`, {
      method: "POST",
      body: JSON.stringify({ data, incluir_anomalia }),
    }),

  // Alertas
  listAlertas: (params?: { resolvido?: boolean; id_painel?: number; tipo_alerta?: TipoAlerta }) => {
    const sp = new URLSearchParams();
    if (params?.resolvido !== undefined) sp.set("resolvido", String(params.resolvido));
    if (params?.id_painel !== undefined) sp.set("id_painel", String(params.id_painel));
    if (params?.tipo_alerta) sp.set("tipo_alerta", params.tipo_alerta);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request<Alerta[]>(`/api/alertas${qs}`);
  },
  resolverAlerta: (idAlerta: number) =>
    request<Alerta>(`/api/alertas/${idAlerta}/resolver`, { method: "PATCH" }),

  // Auditoria
  listAuditoria: (params?: { acao?: string; tabela_alvo?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.acao) sp.set("acao", params.acao);
    if (params?.tabela_alvo) sp.set("tabela_alvo", params.tabela_alvo);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return request<LogAuditoria[]>(`/api/auditoria${qs}`);
  },
};
