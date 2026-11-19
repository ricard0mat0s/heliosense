import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import type { LogAuditoria } from "../types";
import { extractErrorMessage, formatDateTime } from "../utils/format";

const ACOES_COMUNS = [
  "LOGIN",
  "LOGIN_FALHA",
  "LOGOUT",
  "CADASTRO",
  "ATUALIZAR_PERFIL",
  "CRIAR_CASA",
  "ATUALIZAR_CASA",
  "EXCLUIR_CASA",
  "CRIAR_MODELO_PAINEL",
  "CRIAR_PAINEL",
  "ATUALIZAR_PAINEL",
  "EXCLUIR_PAINEL",
  "REGISTRAR_LEITURA",
  "SIMULAR_CURVA_24H",
  "RESOLVER_ALERTA",
  "DESATIVAR_CONTA",
];

const TABELAS_COMUNS = [
  "usuarios",
  "casas",
  "modelos_paineis",
  "paineis",
  "leituras_energia",
  "alertas",
];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [acaoFilter, setAcaoFilter] = useState("");
  const [tabelaFilter, setTabelaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAuditoria({
        acao: acaoFilter || undefined,
        tabela_alvo: tabelaFilter || undefined,
        limit: 150,
      });
      setLogs(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acaoFilter, tabelaFilter]);

  function actionBadgeClass(acao: string): string {
    if (acao.includes("FALHA") || acao.includes("DESATIVAR") || acao.includes("EXCLUIR")) {
      return "bg-rose-100 text-rose-800";
    }
    if (acao.includes("LOGIN") || acao.includes("CADASTRO")) {
      return "bg-emerald-100 text-emerald-800";
    }
    if (acao.includes("ALERTA")) {
      return "bg-amber-100 text-amber-900";
    }
    return "bg-stone-100 text-stone-800";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Tabela · logs_auditoria
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">
            Logs de Auditoria
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Registro imutável das ações realizadas pela sua conta na aplicação FastAPI, com IP de
            origem e metadados JSON.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-stone-500">Filtrar por ação</label>
          <select
            value={acaoFilter}
            onChange={(e) => setAcaoFilter(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-amber-500"
          >
            <option value="">Todas as ações</option>
            {ACOES_COMUNS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-stone-500">
            Filtrar por tabela alvo
          </label>
          <select
            value={tabelaFilter}
            onChange={(e) => setTabelaFilter(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-amber-500"
          >
            <option value="">Todas as tabelas</option>
            {TABELAS_COMUNS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Carregando logs de auditoria...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">Nenhum registro encontrado</h2>
          <p className="mt-1 text-sm text-stone-500">
            Ajuste os filtros para visualizar outras ações registradas.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3.5">Data / Hora</th>
                  <th className="px-4 py-3.5">Ação</th>
                  <th className="px-4 py-3.5">Tabela / Alvo</th>
                  <th className="px-4 py-3.5">Detalhes</th>
                  <th className="px-4 py-3.5">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((log) => (
                  <tr key={log.id_log} className="hover:bg-stone-50/70">
                    <td className="font-mono-num whitespace-nowrap px-4 py-3 text-stone-600">
                      {formatDateTime(log.criado_em)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${actionBadgeClass(log.acao)}`}
                      >
                        {log.acao}
                      </span>
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-4 py-3 text-stone-700">
                      {log.tabela_alvo ?? "—"}
                      {log.id_alvo ? (
                        <span className="text-stone-400"> #{log.id_alvo}</span>
                      ) : null}
                    </td>
                    <td className="max-w-md break-all px-4 py-3 font-mono text-[11px] text-stone-600">
                      {log.detalhes ?? "—"}
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-4 py-3 text-stone-500">
                      {log.endereco_ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
