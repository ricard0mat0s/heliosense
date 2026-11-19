export type DataSourceMode = "mock" | "mysql";
export type StatusPainel = "ativo" | "manutencao" | "inativo";
export type TipoAlerta = "ZERO_DIURNO" | "ACIMA_CAPACIDADE";

export interface HealthInfo {
  status: string;
  data_source: DataSourceMode;
  database_connected: boolean;
}

export interface Usuario {
  cpf: string;
  nome: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ativo: boolean;
  criado_em: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface UsuarioRegisterPayload {
  cpf: string;
  nome: string;
  data_nascimento: string;
  email: string;
  senha: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface UsuarioUpdatePayload {
  nome: string;
  data_nascimento: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface Casa {
  id_casa: number;
  cpf_proprietario: string;
  nome: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  criado_em: string;
  qtd_paineis: number;
  energia_total_kwh: number;
}

export interface CasaPayload {
  nome?: string | null;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface ModeloPainel {
  id_modelo: number;
  marca: string;
  nome_modelo: string;
  potencia_max_w: number;
  eficiencia_pct: number | null;
}

export interface ModeloPainelPayload {
  marca: string;
  nome_modelo: string;
  potencia_max_w: number;
  eficiencia_pct?: number | null;
}

export interface Painel {
  id_painel: number;
  id_casa: number;
  nome_casa: string | null;
  id_modelo: number;
  marca: string;
  nome_modelo: string;
  potencia_max_w: number;
  eficiencia_pct: number | null;
  numero_serie: string;
  data_instalacao: string;
  status: StatusPainel;
  energia_total_kwh: number;
  alertas_abertos: number;
}

export interface PainelPayload {
  id_casa: number;
  id_modelo: number;
  numero_serie: string;
  data_instalacao: string;
  status: StatusPainel;
}

export interface LeituraHoraria {
  id_leitura: number;
  id_painel: number;
  numero_serie: string;
  id_casa: number;
  nome_casa: string | null;
  registrado_em: string;
  energia_kwh: number;
  potencia_max_w: number;
}

export interface LeituraDiaria {
  id_painel: number;
  numero_serie: string;
  id_casa: number;
  nome_casa: string | null;
  data_leitura: string;
  total_leituras: number;
  energia_total_kwh: number;
}

export interface Alerta {
  id_alerta: number;
  id_painel: number;
  numero_serie: string | null;
  id_casa: number | null;
  nome_casa: string | null;
  id_leitura: number;
  tipo_alerta: TipoAlerta;
  mensagem: string;
  resolvido: boolean;
  criado_em: string;
  resolvido_em: string | null;
}

export interface LeituraRegistroResponse {
  id_leitura: number;
  id_painel: number;
  registrado_em: string;
  energia_kwh: number;
  alertas_gerados: Alerta[];
}

export interface SimularDiaResponse {
  leituras_inseridas: number;
  leituras_ignoradas: number;
  alertas_gerados: Alerta[];
}

export interface ResumoCasaSP {
  id_casa: number;
  nome: string | null;
  qtd_paineis: number;
  energia_total_casa: number;
}

export interface ResumoPainelSP {
  id_casa: number;
  id_painel: number;
  numero_serie: string;
  energia_total_painel: number;
  status: StatusPainel | null;
  marca: string | null;
  nome_modelo: string | null;
  potencia_max_w: number | null;
  alertas_abertos: number;
}

export interface DashboardResumo {
  data_source: DataSourceMode;
  energia_total_kwh: number;
  total_casas: number;
  total_paineis: number;
  paineis_ativos: number;
  alertas_abertos: number;
  casas: ResumoCasaSP[];
  paineis: ResumoPainelSP[];
}

export interface LogAuditoria {
  id_log: number;
  cpf_usuario: string;
  acao: string;
  tabela_alvo: string | null;
  id_alvo: string | null;
  detalhes: string | null;
  endereco_ip: string | null;
  criado_em: string;
}
