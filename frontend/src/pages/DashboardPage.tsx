import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Home,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";
import { api } from "../api/client";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SkeletonBlock } from "../components/Skeleton";
import { PanelStatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { DashboardResumo } from "../types";
import { extractErrorMessage, formatKwh } from "../utils/format";

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando resumo de geração">
      <div className="hs-card grid grid-cols-1 divide-y divide-stone-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-2.5 p-5">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-7 w-32" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
          <SkeletonBlock className="h-5 w-44" />
          <SkeletonBlock className="h-6 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="hs-card space-y-4 p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3.5 w-40" />
                </div>
                <SkeletonBlock className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <SkeletonBlock className="h-6 w-24" />
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, refreshOpenAlertsCount } = useAuth();
  const [resumo, setResumo] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardResumo();
      setResumo(data);
      await refreshOpenAlertsCount();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.nome.split(" ")[0] ?? "Cliente";
  const hasOpenAlerts = (resumo?.alertas_abertos ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
          Olá, {firstName}
        </h1>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="hs-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Atualizar
          </button>
          <Link to="/paineis" className="hs-btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Gerenciar painéis
          </Link>
        </div>
      </div>

      {error && (
        <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboard}
              className="font-semibold underline hover:text-rose-950"
            >
              Tentar novamente
            </button>
          </div>
        </FeedbackBanner>
      )}

      {loading && !resumo ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Cohesive Summary Bar */}
          <section
            aria-label="Resumo geral"
            className="hs-card grid grid-cols-1 divide-y divide-stone-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <Zap className="h-4 w-4 text-amber-700" aria-hidden="true" />
                Energia produzida
              </div>
              <div className="font-mono-num mt-2 text-2xl font-extrabold tracking-tight text-stone-900">
                {resumo ? formatKwh(resumo.energia_total_kwh) : "—"}
              </div>
            </div>

            <Link
              to="/casas"
              className="group block p-5 transition-colors hover:bg-stone-50/80"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-stone-600" aria-hidden="true" />
                  Residências
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 text-stone-400 transition group-hover:text-amber-700"
                  aria-hidden="true"
                />
              </div>
              <div className="font-mono-num mt-2 text-2xl font-extrabold tracking-tight text-stone-900">
                {resumo ? resumo.total_casas : "—"}
              </div>
            </Link>

            <Link
              to="/alertas"
              className={`group block rounded-b-2xl p-5 transition-colors sm:rounded-r-2xl sm:rounded-bl-none ${
                hasOpenAlerts ? "bg-rose-50/55 hover:bg-rose-50" : "hover:bg-stone-50/80"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                <span className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${hasOpenAlerts ? "text-rose-700" : "text-emerald-700"}`}
                    aria-hidden="true"
                  />
                  Alertas
                </span>
                <ArrowUpRight
                  className={`h-3.5 w-3.5 transition ${
                    hasOpenAlerts
                      ? "text-rose-700 group-hover:translate-x-0.5"
                      : "text-stone-400 group-hover:text-amber-700"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <div
                className={`font-mono-num mt-2 text-2xl font-extrabold tracking-tight ${
                  hasOpenAlerts ? "text-rose-800" : "text-stone-900"
                }`}
              >
                {resumo ? resumo.alertas_abertos : "—"}
              </div>
            </Link>
          </section>

          {/* Residences & Panels */}
          {resumo && resumo.casas.length === 0 ? (
            <div className="hs-card border-dashed border-stone-300 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Home className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-stone-900">
                Nenhuma residência cadastrada
              </h2>
              <Link to="/casas" className="hs-btn-primary mt-5">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Cadastrar residência
              </Link>
            </div>
          ) : (
            resumo && (
              <div className="space-y-9">
                {resumo.casas.map((casa) => {
                  const housePanels = resumo.paineis.filter((p) => p.id_casa === casa.id_casa);
                  return (
                    <section key={casa.id_casa} className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/90 pb-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg font-extrabold tracking-tight text-stone-900">
                            {casa.nome || `Residência #${casa.id_casa}`}
                          </h2>
                          <span className="rounded-full bg-stone-200/75 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                            {casa.qtd_paineis} {casa.qtd_paineis === 1 ? "painel" : "painéis"}
                          </span>
                        </div>

                        <div className="font-mono-num text-xl font-extrabold text-amber-800">
                          {formatKwh(casa.energia_total_casa)}
                        </div>
                      </div>

                      {housePanels.length === 0 ? (
                        <div className="hs-card border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-600">
                          Nenhum painel instalado.{" "}
                          <Link
                            to={`/paineis?casa=${casa.id_casa}`}
                            className="font-semibold text-amber-800 hover:underline"
                          >
                            Adicionar painel
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {housePanels.map((panel) => (
                            <Link
                              key={panel.id_painel}
                              to={`/paineis/${panel.id_painel}`}
                              className="hs-card group flex flex-col justify-between p-5 transition duration-150 hover:border-amber-400 hover:shadow-[0_6px_20px_-8px_rgba(180,83,9,0.16)]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-mono-num truncate text-sm font-bold text-stone-900 group-hover:text-amber-800">
                                    {panel.numero_serie}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs text-stone-500">
                                    {panel.marca && panel.nome_modelo
                                      ? `${panel.marca} · ${panel.nome_modelo}`
                                      : `Painel #${panel.id_painel}`}
                                  </div>
                                </div>
                                <PanelStatusBadge status={panel.status} />
                              </div>

                              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-3.5">
                                <div className="font-mono-num text-lg font-extrabold text-stone-900">
                                  {formatKwh(panel.energia_total_painel)}
                                </div>

                                <div className="flex items-center gap-2">
                                  {panel.alertas_abertos > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                      {panel.alertas_abertos}
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-stone-50 text-stone-500 ring-1 ring-stone-200 transition-colors group-hover:bg-amber-700 group-hover:text-white group-hover:ring-amber-700"
                                    aria-hidden="true"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
