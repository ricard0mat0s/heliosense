import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { api } from "../api/client";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SkeletonBlock } from "../components/Skeleton";
import { AlertTypeBadge, PanelStatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { Alerta, LeituraDiaria, LeituraHoraria, Painel } from "../types";
import {
  extractErrorMessage,
  formatDateOnly,
  formatDateTime,
  formatKwh,
  formatNumber,
  formatShortDate,
  formatShortHour,
  toLocalDateString,
} from "../utils/format";

function PanelDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dados do painel">
      <SkeletonBlock className="h-4 w-36" />
      <div className="hs-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="space-y-2.5">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-4 w-64" />
          <SkeletonBlock className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-3.5 w-24" />
          <SkeletonBlock className="h-7 w-32" />
        </div>
      </div>
      <div className="hs-card space-y-5 p-6">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-52" />
          <SkeletonBlock className="h-9 w-48 rounded-xl" />
        </div>
        <SkeletonBlock className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function PanelDetailPage() {
  const { idPainel } = useParams<{ idPainel: string }>();
  const panelId = Number(idPainel);
  const { refreshOpenAlertsCount } = useAuth();

  const [panel, setPanel] = useState<Painel | null>(null);
  const [hourly, setHourly] = useState<LeituraHoraria[]>([]);
  const [daily, setDaily] = useState<LeituraDiaria[]>([]);
  const [alerts, setAlerts] = useState<Alerta[]>([]);
  const [activeTab, setActiveTab] = useState<"horaria" | "diaria">("horaria");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Simulator state
  const [simDate, setSimDate] = useState(() => toLocalDateString(new Date()));
  const [simHour, setSimHour] = useState("13");
  const [simKwh, setSimKwh] = useState("0.4200");
  const [simDayDate, setSimDayDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalDateString(tomorrow);
  });
  const [simDayAnomaly, setSimDayAnomaly] = useState<
    "nenhuma" | "zero_diurno" | "acima_capacidade"
  >("nenhuma");
  const [simBusy, setSimBusy] = useState(false);
  const [simFeedback, setSimFeedback] = useState<{
    kind: "success" | "warning" | "error";
    title: string;
    alerts?: Alerta[];
  } | null>(null);

  async function loadAll() {
    if (!panelId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, h, d, a] = await Promise.all([
        api.getPainel(panelId),
        api.getLeiturasHoraria(panelId, 72),
        api.getLeiturasDiaria(panelId, 30),
        api.listAlertas({ id_painel: panelId }),
      ]);
      setPanel(p);
      setHourly(h);
      setDaily(d);
      setAlerts(a);
      await refreshOpenAlertsCount();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  const maxKwhPerHour = useMemo(() => {
    if (!panel) return 0;
    return Number((panel.potencia_max_w / 1000).toFixed(4));
  }, [panel]);

  const hourlyChartData = useMemo(
    () =>
      hourly.map((item) => ({
        label: formatShortHour(item.registrado_em),
        fullTime: formatDateTime(item.registrado_em),
        energia_kwh: item.energia_kwh,
      })),
    [hourly]
  );

  const dailyChartData = useMemo(
    () =>
      daily.map((item) => ({
        label: formatShortDate(item.data_leitura),
        fullDate: formatDateOnly(item.data_leitura),
        energia_total_kwh: item.energia_total_kwh,
        total_leituras: item.total_leituras,
      })),
    [daily]
  );

  async function submitSingleReading(dateStr: string, hourStr: string, kwhVal: number) {
    setSimBusy(true);
    setSimFeedback(null);
    try {
      const hh = hourStr.padStart(2, "0");
      const iso = `${dateStr}T${hh}:00:00`;
      const res = await api.registrarLeitura(panelId, iso, kwhVal);
      if (res.alertas_gerados.length > 0) {
        setSimFeedback({
          kind: "warning",
          title: `Leitura registrada (${formatKwh(res.energia_kwh, 4)} às ${hh}:00) — ${res.alertas_gerados.length} ${res.alertas_gerados.length === 1 ? "anomalia detectada" : "anomalias detectadas"} automaticamente.`,
          alerts: res.alertas_gerados,
        });
      } else {
        setSimFeedback({
          kind: "success",
          title: `Leitura registrada com sucesso (${formatKwh(res.energia_kwh, 4)} às ${hh}:00). Nenhuma anomalia detectada.`,
        });
      }
      await loadAll();
    } catch (err) {
      setSimFeedback({
        kind: "error",
        title: extractErrorMessage(err),
      });
    } finally {
      setSimBusy(false);
    }
  }

  async function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    await submitSingleReading(simDate, simHour, Number(simKwh));
  }

  function applyPreset(preset: "normal" | "zero_diurno" | "acima_capacidade") {
    if (!panel) return;
    const cap = panel.potencia_max_w / 1000;
    if (preset === "normal") {
      setSimHour("12");
      setSimKwh((cap * 0.82).toFixed(4));
    } else if (preset === "zero_diurno") {
      setSimHour("13");
      setSimKwh("0.0000");
    } else {
      setSimHour("12");
      setSimKwh((cap * 1.35).toFixed(4));
    }
  }

  async function handleSimulateDay() {
    setSimBusy(true);
    setSimFeedback(null);
    try {
      const res = await api.simularDia(panelId, simDayDate, simDayAnomaly);
      setSimFeedback({
        kind: res.alertas_gerados.length > 0 ? "warning" : "success",
        title: `Curva de 24h concluída para ${formatDateOnly(simDayDate)}: ${res.leituras_inseridas} ${res.leituras_inseridas === 1 ? "leitura inserida" : "leituras inseridas"}, ${res.leituras_ignoradas} já ${res.leituras_ignoradas === 1 ? "existente" : "existentes"}.`,
        alerts: res.alertas_gerados,
      });
      await loadAll();
    } catch (err) {
      setSimFeedback({ kind: "error", title: extractErrorMessage(err) });
    } finally {
      setSimBusy(false);
    }
  }

  async function handleResolveAlert(idAlerta: number) {
    setResolvingId(idAlerta);
    setError(null);
    try {
      await api.resolverAlerta(idAlerta);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  }

  if (loading && !panel) {
    return <PanelDetailSkeleton />;
  }

  if (error && !panel) {
    return (
      <div className="space-y-4">
        <Link
          to="/paineis"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-amber-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para Painéis Solares
        </Link>
        <FeedbackBanner tone="error">{error}</FeedbackBanner>
      </div>
    );
  }

  if (!panel) return null;

  return (
    <div className="space-y-6">
      {/* Back navigation & Header */}
      <div className="space-y-3">
        <Link
          to="/paineis"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 transition hover:text-amber-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para Painéis Solares
        </Link>

        <div className="hs-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono-num text-2xl font-extrabold tracking-tight text-stone-900">
                {panel.numero_serie}
              </h1>
              <PanelStatusBadge status={panel.status} />
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {panel.nome_casa || `Residência #${panel.id_casa}`} · {panel.marca}{" "}
              {panel.nome_modelo}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-stone-600">
              <div className="flex items-center gap-1">
                <dt className="text-stone-500">Potência máx.:</dt>
                <dd className="font-mono-num font-semibold text-stone-900">
                  {panel.potencia_max_w} W ({formatNumber(maxKwhPerHour, 4)} kWh/h)
                </dd>
              </div>
              {panel.eficiencia_pct && (
                <div className="flex items-center gap-1">
                  <dt className="text-stone-500">Eficiência:</dt>
                  <dd className="font-mono-num font-semibold text-stone-900">
                    {panel.eficiencia_pct}%
                  </dd>
                </div>
              )}
              <div className="flex items-center gap-1">
                <dt className="text-stone-500">Instalado em:</dt>
                <dd className="font-mono-num font-semibold text-stone-900">
                  {formatDateOnly(panel.data_instalacao)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-stone-100 pt-4 text-left sm:border-t-0 sm:pt-0 sm:text-right">
            <div className="text-xs font-medium text-stone-500">Geração total acumulada</div>
            <div className="font-mono-num mt-0.5 text-2xl font-extrabold text-amber-800">
              {formatKwh(panel.energia_total_kwh)}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
          {error}
        </FeedbackBanner>
      )}

      {/* Generation Charts */}
      <section className="hs-card p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-stone-900">
              Relatório de Energia Produzida
            </h2>
            <p className="mt-0.5 text-xs text-stone-600">
              {activeTab === "horaria"
                ? "Últimas 72 leituras horárias registradas para este painel"
                : "Produção diária acumulada nos últimos 30 dias"}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Período do relatório"
            className="inline-flex self-start rounded-xl bg-stone-100 p-1 sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "horaria"}
              onClick={() => setActiveTab("horaria")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "horaria"
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Visão horária
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "diaria"}
              onClick={() => setActiveTab("diaria")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "diaria"
                  ? "bg-white text-amber-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Visão diária
            </button>
          </div>
        </div>

        <div className="mt-6 h-80 w-full">
          {activeTab === "horaria" ? (
            hourlyChartData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 px-6 text-center text-sm text-stone-600">
                <p className="font-semibold text-stone-800">Nenhuma leitura horária registrada</p>
                <p className="mt-1 text-xs text-stone-500">
                  Use o simulador de leituras abaixo para registrar os primeiros dados deste painel.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={hourlyChartData}
                  margin={{ top: 12, right: 20, left: 0, bottom: 6 }}
                >
                  <defs>
                    <linearGradient id="solarAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#57534E" }}
                    tickLine={false}
                    axisLine={{ stroke: "#D6D3D1" }}
                    minTickGap={28}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#57534E" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${formatNumber(v, 2)} kWh`}
                    width={84}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatKwh(value, 4), "Produção na hora"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullTime
                        ? `Fechamento: ${payload[0].payload.fullTime}`
                        : ""
                    }
                    contentStyle={{
                      borderRadius: "12px",
                      borderColor: "#E7E5E4",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px -8px rgba(28,25,23,0.14)",
                    }}
                  />
                  {maxKwhPerHour > 0 && (
                    <ReferenceLine
                      y={maxKwhPerHour}
                      stroke="#BE123C"
                      strokeDasharray="5 5"
                      label={{
                        value: `Limite nominal (${formatNumber(maxKwhPerHour, 2)} kWh/h)`,
                        position: "insideTopRight",
                        fill: "#BE123C",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="energia_kwh"
                    stroke="#B45309"
                    strokeWidth={2.2}
                    fill="url(#solarAmber)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : dailyChartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 px-6 text-center text-sm text-stone-600">
              <p className="font-semibold text-stone-800">Nenhum dado diário disponível</p>
              <p className="mt-1 text-xs text-stone-500">
                Os acumulados diários aparecerão automaticamente após o registro de leituras.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 12, right: 20, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#57534E" }}
                  tickLine={false}
                  axisLine={{ stroke: "#D6D3D1" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#57534E" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${formatNumber(v, 1)} kWh`}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [formatKwh(value, 3), "Total do dia"]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${row.fullDate} (${row.total_leituras} leituras)` : "";
                  }}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#E7E5E4",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px -8px rgba(28,25,23,0.14)",
                  }}
                />
                <Bar dataKey="energia_total_kwh" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Reading Simulator + Panel Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="hs-card p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-stone-900">
                Simulador de Leituras
              </h2>
              <p className="mt-0.5 text-xs text-stone-600">
                Registre uma leitura manual ou simule cenários de anomalia para validar os alertas
                automáticos deste painel.
              </p>
            </div>
          </div>

          {/* 1-click Anomaly Test Scenarios */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-stone-600">Cenários rápidos</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("normal")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              >
                <Sun className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                Leitura normal
              </button>
              <button
                type="button"
                onClick={() => applyPreset("zero_diurno")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-300 transition hover:bg-amber-100"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                Zero diurno (13h)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("acima_capacidade")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 ring-1 ring-rose-200 transition hover:bg-rose-100"
              >
                <Flame className="h-3.5 w-3.5 text-rose-700" aria-hidden="true" />
                Acima da capacidade
              </button>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="mt-4 space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="sim-date" className="hs-label">
                  Data *
                </label>
                <input
                  id="sim-date"
                  type="date"
                  required
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className="hs-input"
                />
              </div>
              <div>
                <label htmlFor="sim-hour" className="hs-label">
                  Hora (fechamento) *
                </label>
                <select
                  id="sim-hour"
                  value={simHour}
                  onChange={(e) => setSimHour(e.target.value)}
                  className="hs-select font-mono-num"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sim-kwh" className="hs-label">
                  Energia (kWh) *
                </label>
                <input
                  id="sim-kwh"
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={simKwh}
                  onChange={(e) => setSimKwh(e.target.value)}
                  className="hs-input font-mono-num"
                />
              </div>
            </div>

            <button type="submit" disabled={simBusy} className="hs-btn-primary w-full">
              {simBusy ? "Registrando leitura..." : "Registrar leitura horária"}
            </button>
          </form>

          {/* 24h Curve generator */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
              <Sparkles className="h-4 w-4 text-amber-700" aria-hidden="true" />
              Gerar curva solar completa (24h)
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Preenche um dia inteiro de leituras horárias com opção de injetar uma anomalia.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sim-day-date" className="hs-label">
                  Data da simulação
                </label>
                <input
                  id="sim-day-date"
                  type="date"
                  value={simDayDate}
                  onChange={(e) => setSimDayDate(e.target.value)}
                  className="hs-input"
                />
              </div>
              <div>
                <label htmlFor="sim-day-anomaly" className="hs-label">
                  Cenário do dia
                </label>
                <select
                  id="sim-day-anomaly"
                  value={simDayAnomaly}
                  onChange={(e) =>
                    setSimDayAnomaly(
                      e.target.value as "nenhuma" | "zero_diurno" | "acima_capacidade"
                    )
                  }
                  className="hs-select"
                >
                  <option value="nenhuma">Dia normal (sem anomalia)</option>
                  <option value="zero_diurno">Injetar zero diurno às 13h</option>
                  <option value="acima_capacidade">Injetar acima da capacidade às 12h</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={simBusy}
              onClick={handleSimulateDay}
              className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100 disabled:opacity-55"
            >
              {simBusy ? "Gerando leituras..." : "Gerar 24 leituras horárias para esta data"}
            </button>
          </div>

          {simFeedback && (
            <FeedbackBanner
              tone={simFeedback.kind}
              className="mt-4 text-xs"
              onDismiss={() => setSimFeedback(null)}
            >
              <p className="font-bold">{simFeedback.title}</p>
              {simFeedback.alerts && simFeedback.alerts.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {simFeedback.alerts.map((al) => (
                    <li key={al.id_alerta} className="flex flex-wrap items-center gap-2">
                      <AlertTypeBadge tipo={al.tipo_alerta} />
                      <span className="font-normal">{al.mensagem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </FeedbackBanner>
          )}
        </section>

        {/* Panel Alerts List */}
        <section className="hs-card flex flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-stone-900">
                Alertas deste Painel
              </h2>
              <p className="mt-0.5 text-xs text-stone-600">
                Anomalias detectadas automaticamente nas leituras deste equipamento.
              </p>
            </div>
            <span className="font-mono-num shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
              {alerts.length} {alerts.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 p-8 text-center">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-stone-800">Nenhum alerta registrado</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-stone-600">
                Use um dos cenários de anomalia no simulador ao lado para testar a detecção
                automática.
              </p>
            </div>
          ) : (
            <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
              {alerts.map((al) => (
                <div
                  key={al.id_alerta}
                  className={`rounded-xl border p-4 ${
                    al.resolvido
                      ? "border-stone-200 bg-stone-50/70"
                      : "border-amber-200 bg-amber-50/45"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTypeBadge tipo={al.tipo_alerta} />
                      <span className="font-mono-num text-xs text-stone-500">
                        Leitura #{al.id_leitura}
                      </span>
                    </div>
                    {al.resolvido ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Resolvido
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={resolvingId === al.id_alerta}
                        onClick={() => handleResolveAlert(al.id_alerta)}
                        className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-55"
                      >
                        {resolvingId === al.id_alerta ? "Resolvendo..." : "Resolver"}
                      </button>
                    )}
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-stone-800">{al.mensagem}</p>
                  <div className="font-mono-num mt-2 text-xs text-stone-500">
                    Detectado em {formatDateTime(al.criado_em)}
                    {al.resolvido_em ? ` · Resolvido em ${formatDateTime(al.resolvido_em)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
