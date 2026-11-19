import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";
import { api } from "../api/client";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SkeletonBlock } from "../components/Skeleton";
import { AlertTypeBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Alerta, TipoAlerta } from "../types";
import { extractErrorMessage, formatDateTime } from "../utils/format";

function AlertsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando alertas">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="hs-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
        >
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-28" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <SkeletonBlock className="h-4 w-full max-w-xl" />
            <SkeletonBlock className="h-3.5 w-44" />
          </div>
          <SkeletonBlock className="h-9 w-36 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function AlertsPage() {
  const { refreshOpenAlertsCount } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("open");
  const [typeFilter, setTypeFilter] = useState<"all" | TipoAlerta>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAlertas({
        resolvido: statusFilter === "all" ? undefined : statusFilter === "resolved",
        tipo_alerta: typeFilter === "all" ? undefined : typeFilter,
      });
      setAlertas(data);
      await refreshOpenAlertsCount();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  async function handleResolve(idAlerta: number) {
    setResolvingId(idAlerta);
    setError(null);
    setFeedback(null);
    try {
      await api.resolverAlerta(idAlerta);
      setFeedback("Alerta marcado como resolvido.");
      await loadAlerts();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  }

  const hasFilters = statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Central de Alertas
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Anomalias detectadas automaticamente quando um painel registra 0 kWh entre 08:00 e
            18:00 ou ultrapassa sua capacidade física nominal.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="hs-btn-secondary shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="hs-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div
          role="tablist"
          aria-label="Filtrar alertas por situação"
          className="inline-flex rounded-xl bg-stone-100 p-1"
        >
          {[
            { id: "open", label: "Em aberto" },
            { id: "resolved", label: "Resolvidos" },
            { id: "all", label: "Todos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id as "all" | "open" | "resolved")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="alerts-type-filter" className="sr-only">
            Filtrar por tipo de anomalia
          </label>
          <select
            id="alerts-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | TipoAlerta)}
            className="hs-select w-auto min-w-[200px] py-2 text-xs font-semibold"
          >
            <option value="all">Todos os tipos de anomalia</option>
            <option value="ZERO_DIURNO">Zero diurno</option>
            <option value="ACIMA_CAPACIDADE">Acima da capacidade</option>
          </select>
        </div>
      </div>

      {feedback && (
        <FeedbackBanner tone="success" onDismiss={() => setFeedback(null)}>
          {feedback}
        </FeedbackBanner>
      )}
      {error && (
        <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
          {error}
        </FeedbackBanner>
      )}

      {loading ? (
        <AlertsSkeleton />
      ) : alertas.length === 0 ? (
        <div className="hs-card border-dashed border-stone-300 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900">
            {statusFilter === "open" && typeFilter === "all"
              ? "Nenhum alerta em aberto"
              : "Nenhum alerta encontrado"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
            {statusFilter === "open" && typeFilter === "all"
              ? "Todos os seus painéis solares estão operando sem anomalias pendentes no momento."
              : "Não há alertas correspondentes aos filtros selecionados."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="hs-btn-secondary mt-5"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Ver todos os alertas
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((al) => (
            <article
              key={al.id_alerta}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:flex-row sm:items-center ${
                al.resolvido
                  ? "border-stone-200/90 bg-white"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {!al.resolvido && (
                    <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  )}
                  <AlertTypeBadge tipo={al.tipo_alerta} />
                  <Link
                    to={`/paineis/${al.id_painel}`}
                    className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-stone-900 hover:text-amber-800 hover:underline"
                  >
                    {al.numero_serie ?? `Painel #${al.id_painel}`}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  {al.nome_casa && (
                    <span className="text-xs text-stone-600">· {al.nome_casa}</span>
                  )}
                  <span className="font-mono-num text-xs text-stone-500">
                    · Leitura #{al.id_leitura}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-stone-800">{al.mensagem}</p>

                <div className="font-mono-num text-xs text-stone-500">
                  Detectado em {formatDateTime(al.criado_em)}
                  {al.resolvido_em ? ` · Resolvido em ${formatDateTime(al.resolvido_em)}` : ""}
                </div>
              </div>

              <div className="shrink-0">
                {al.resolvido ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Resolvido
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resolvingId === al.id_alerta}
                    onClick={() => handleResolve(al.id_alerta)}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-stone-800 disabled:opacity-55"
                  >
                    {resolvingId === al.id_alerta ? "Resolvendo..." : "Marcar como resolvido"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
