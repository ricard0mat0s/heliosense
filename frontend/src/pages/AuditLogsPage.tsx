import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SkeletonTable } from "../components/Skeleton";
import type { LogAuditoria } from "../types";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_TARGET_LABELS,
  extractErrorMessage,
  formatAuditAction,
  formatAuditDetails,
  formatAuditTarget,
  formatDateTime,
} from "../utils/format";

const ACOES_COMUNS = Object.keys(AUDIT_ACTION_LABELS);
const CATEGORIAS_COMUNS = Object.keys(AUDIT_TARGET_LABELS);

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
      return "bg-rose-100 text-rose-900 ring-rose-200";
    }
    if (acao.includes("LOGIN") || acao.includes("CADASTRO")) {
      return "bg-emerald-100 text-emerald-900 ring-emerald-200";
    }
    if (acao.includes("ALERTA")) {
      return "bg-amber-100 text-amber-950 ring-amber-300/70";
    }
    return "bg-stone-100 text-stone-800 ring-stone-200";
  }

  const hasFilters = Boolean(acaoFilter || tabelaFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Histórico de Auditoria
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Acompanhe os acessos e alterações realizados na sua conta, com data, horário e endereço
            de origem.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="hs-btn-secondary shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="hs-card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[210px] flex-1">
          <label htmlFor="audit-action-filter" className="hs-label">
            Tipo de ação
          </label>
          <select
            id="audit-action-filter"
            value={acaoFilter}
            onChange={(e) => setAcaoFilter(e.target.value)}
            className="hs-select"
          >
            <option value="">Todas as ações</option>
            {ACOES_COMUNS.map((a) => (
              <option key={a} value={a}>
                {formatAuditAction(a)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[210px] flex-1">
          <label htmlFor="audit-category-filter" className="hs-label">
            Área da conta
          </label>
          <select
            id="audit-category-filter"
            value={tabelaFilter}
            onChange={(e) => setTabelaFilter(e.target.value)}
            className="hs-select"
          >
            <option value="">Todas as áreas</option>
            {CATEGORIAS_COMUNS.map((t) => (
              <option key={t} value={t}>
                {formatAuditTarget(t)}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setAcaoFilter("");
              setTabelaFilter("");
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>

      {error && (
        <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
          {error}
        </FeedbackBanner>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : logs.length === 0 ? (
        <div className="hs-card border-dashed border-stone-300 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900">Nenhum registro encontrado</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
            {hasFilters
              ? "Nenhuma atividade corresponde aos filtros selecionados."
              : "As atividades realizadas na sua conta aparecerão aqui automaticamente."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setAcaoFilter("");
                setTabelaFilter("");
              }}
              className="hs-btn-secondary mt-5"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="hs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wide text-stone-600">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    Data e hora
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Ação
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Área
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Resumo
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Origem (IP)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((log) => (
                  <tr key={log.id_log} className="transition-colors hover:bg-stone-50/80">
                    <td className="font-mono-num whitespace-nowrap px-4 py-3.5 text-stone-600">
                      {formatDateTime(log.criado_em)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${actionBadgeClass(log.acao)}`}
                      >
                        {formatAuditAction(log.acao)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-stone-700">
                      {formatAuditTarget(log.tabela_alvo)}
                      {log.id_alvo ? (
                        <span className="font-mono-num text-stone-500"> #{log.id_alvo}</span>
                      ) : null}
                    </td>
                    <td className="max-w-md px-4 py-3.5 text-stone-700">
                      <span className="block break-words leading-relaxed">
                        {formatAuditDetails(log.detalhes)}
                      </span>
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-4 py-3.5 text-right text-stone-500">
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
