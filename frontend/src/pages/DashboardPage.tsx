import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  Database,
  Home,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";
import { api } from "../api/client";
import { PanelStatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { DashboardResumo } from "../types";
import { extractErrorMessage, formatKwh } from "../utils/format";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Resumo Geral · sp_resumo_energia_casa
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Visão consolidada da geração solar por residência e por painel individual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <Link
            to="/paineis"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Gerenciar Painéis
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Energia Total Gerada
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <div className="font-mono-num mt-3 text-2xl font-extrabold text-stone-900">
            {resumo ? formatKwh(resumo.energia_total_kwh) : "—"}
          </div>
          <p className="mt-1 text-xs text-stone-500">Acumulado de todas as residências</p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Residências
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Home className="h-5 w-5" />
            </span>
          </div>
          <div className="font-mono-num mt-3 text-2xl font-extrabold text-stone-900">
            {resumo ? resumo.total_casas : "—"}
          </div>
          <p className="mt-1 text-xs text-stone-500">Imóveis monitorados</p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Painéis Instalados
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Cpu className="h-5 w-5" />
            </span>
          </div>
          <div className="font-mono-num mt-3 text-2xl font-extrabold text-stone-900">
            {resumo ? `${resumo.paineis_ativos}/${resumo.total_paineis}` : "—"}
          </div>
          <p className="mt-1 text-xs text-stone-500">Painéis ativos no total cadastrado</p>
        </div>

        <Link
          to="/alertas"
          className="group rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Alertas em Aberto
            </span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                (resumo?.alertas_abertos ?? 0) > 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
          </div>
          <div className="font-mono-num mt-3 text-2xl font-extrabold text-stone-900">
            {resumo ? resumo.alertas_abertos : "—"}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 group-hover:underline">
            Ver central de alertas
            <ArrowUpRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </div>

      {/* Stored Procedure Result Set 1 + 2 */}
      {loading && !resumo ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Carregando resumo energético...
        </div>
      ) : resumo && resumo.casas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Home className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">Nenhuma residência cadastrada</h2>
          <p className="mt-1 text-sm text-stone-500">
            Cadastre sua primeira casa e adicione painéis solares para começar a monitorar a
            produção.
          </p>
          <Link
            to="/casas"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Cadastrar primeira casa
          </Link>
        </div>
      ) : (
        resumo && (
          <div className="space-y-6">
            {resumo.casas.map((casa) => {
              const housePanels = resumo.paineis.filter((p) => p.id_casa === casa.id_casa);
              return (
                <section
                  key={casa.id_casa}
                  className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs"
                >
                  <div className="flex flex-col justify-between gap-3 border-b border-stone-100 bg-stone-50/70 px-6 py-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-stone-900">
                          {casa.nome || `Residência #${casa.id_casa}`}
                        </h2>
                        <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                          {casa.qtd_paineis} {casa.qtd_paineis === 1 ? "painel" : "painéis"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Clique em qualquer painel abaixo para abrir os gráficos horário/diário e o
                        simulador de leituras.
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Total da Casa
                      </div>
                      <div className="font-mono-num text-xl font-extrabold text-amber-700">
                        {formatKwh(casa.energia_total_casa)}
                      </div>
                    </div>
                  </div>

                  {housePanels.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-stone-500">
                      Nenhum painel instalado nesta casa ainda.{" "}
                      <Link to="/paineis" className="font-bold text-amber-700 hover:underline">
                        Adicionar painel
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                      {housePanels.map((panel) => (
                        <Link
                          key={panel.id_painel}
                          to={`/paineis/${panel.id_painel}`}
                          className="group flex flex-col justify-between rounded-xl border border-stone-200/90 bg-[#FAF8F5]/60 p-4 transition hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-mono-num text-sm font-bold text-stone-900 group-hover:text-amber-800">
                                {panel.numero_serie}
                              </div>
                              <div className="mt-0.5 text-xs text-stone-500">
                                {panel.marca && panel.nome_modelo
                                  ? `${panel.marca} · ${panel.nome_modelo}`
                                  : `Painel #${panel.id_painel}`}
                              </div>
                            </div>
                            <PanelStatusBadge status={panel.status} />
                          </div>

                          <div className="mt-4 flex items-end justify-between border-t border-stone-200/70 pt-3">
                            <div>
                              <div className="text-[11px] font-semibold uppercase text-stone-500">
                                Produção Acumulada
                              </div>
                              <div className="font-mono-num text-lg font-extrabold text-stone-900">
                                {formatKwh(panel.energia_total_painel)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {panel.alertas_abertos > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                                  <AlertTriangle className="h-3 w-3" />
                                  {panel.alertas_abertos}
                                </span>
                              )}
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-500 ring-1 ring-stone-200 transition group-hover:bg-amber-600 group-hover:text-white group-hover:ring-amber-600">
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

      {/* Subtle seminar technical footer note */}
      <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white px-4 py-3 text-xs text-stone-600">
        <Database className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Os totais por casa e por painel nesta tela consomem os 2 result sets da stored procedure{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-800">
            sp_resumo_energia_casa(cpf_usuario)
          </code>
          .
        </span>
      </div>
    </div>
  );
}
