import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { AlertTypeBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Alerta, TipoAlerta } from "../types";
import { extractErrorMessage, formatDateTime } from "../utils/format";

export function AlertsPage() {
  const { refreshOpenAlertsCount } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("open");
  const [typeFilter, setTypeFilter] = useState<"all" | TipoAlerta>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    try {
      await api.resolverAlerta(idAlerta);
      await loadAlerts();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Tabela · alertas (Trigger em leituras_energia)
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">
            Central de Alertas
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Anomalias detectadas automaticamente quando um painel gera 0 kWh entre 08:00 e 18:00 ou
            ultrapassa sua capacidade física nominal.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
        <div className="inline-flex rounded-xl bg-stone-100 p-1">
          {[
            { id: "open", label: "Em aberto" },
            { id: "resolved", label: "Resolvidos" },
            { id: "all", label: "Todos" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as "all" | "open" | "resolved")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? "bg-white text-amber-800 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | TipoAlerta)}
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-amber-500"
        >
          <option value="all">Todos os tipos</option>
          <option value="ZERO_DIURNO">ZERO_DIURNO</option>
          <option value="ACIMA_CAPACIDADE">ACIMA_CAPACIDADE</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Carregando alertas...
        </div>
      ) : alertas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">Nenhum alerta encontrado</h2>
          <p className="mt-1 text-sm text-stone-500">
            Não há alertas correspondentes aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((al) => (
            <div
              key={al.id_alerta}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center ${
                al.resolvido
                  ? "border-stone-200 bg-white"
                  : "border-amber-200 bg-amber-50/35"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {!al.resolvido && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  <AlertTypeBadge tipo={al.tipo_alerta} />
                  <Link
                    to={`/paineis/${al.id_painel}`}
                    className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-stone-900 hover:text-amber-700 hover:underline"
                  >
                    {al.numero_serie ?? `Painel #${al.id_painel}`}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  {al.nome_casa && (
                    <span className="text-xs text-stone-500">· {al.nome_casa}</span>
                  )}
                  <span className="font-mono-num text-xs text-stone-400">
                    · Leitura #{al.id_leitura}
                  </span>
                </div>

                <p className="text-sm text-stone-800">{al.mensagem}</p>

                <div className="font-mono-num text-xs text-stone-500">
                  Criado em {formatDateTime(al.criado_em)}
                  {al.resolvido_em ? ` · Resolvido em ${formatDateTime(al.resolvido_em)}` : ""}
                </div>
              </div>

              <div className="shrink-0">
                {al.resolvido ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolvido
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resolvingId === al.id_alerta}
                    onClick={() => handleResolve(al.id_alerta)}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-stone-800 disabled:opacity-60"
                  >
                    {resolvingId === al.id_alerta ? "Resolvendo..." : "Marcar como resolvido"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
