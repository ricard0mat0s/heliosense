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
          title: `Leitura #${res.id_leitura} registrada (${formatKwh(res.energia_kwh, 4)}) — Trigger disparou ${res.alertas_gerados.length} alerta(s)!`,
          alerts: res.alertas_gerados,
        });
      } else {
        setSimFeedback({
          kind: "success",
          title: `Leitura #${res.id_leitura} registrada com sucesso (${formatKwh(res.energia_kwh, 4)} às ${hh}:00). Nenhuma anomalia detectada.`,
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
        title: `Curva 24h concluída para ${formatDateOnly(simDayDate)}: ${res.leituras_inseridas} leitura(s) inserida(s), ${res.leituras_ignoradas} já existente(s).`,
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
    try {
      await api.resolverAlerta(idAlerta);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (loading && !panel) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-sm text-stone-500">
        Carregando dados do painel...
      </div>
    );
  }

  if (error && !panel) {
    return (
      <div className="space-y-4">
        <Link
          to="/paineis"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Painéis
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  if (!panel) return null;

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          to="/paineis"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Painéis
        </Link>

        <div className="mt-2 flex flex-col justify-between gap-4 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono-num text-2xl font-extrabold text-stone-900">
                {panel.numero_serie}
              </h1>
              <PanelStatusBadge status={panel.status} />
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {panel.nome_casa || `Residência #${panel.id_casa}`} · {panel.marca}{" "}
              {panel.nome_modelo}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-500">
              <span>
                Potência Máx.:{" "}
                <strong className="font-mono-num text-stone-800">{panel.potencia_max_w} W</strong>{" "}
                (teto{" "}
                <strong className="font-mono-num text-stone-800">
                  {formatNumber(maxKwhPerHour, 4)} kWh/h
                </strong>
                )
              </span>
              {panel.eficiencia_pct && (
                <span>
                  Eficiência:{" "}
                  <strong className="font-mono-num text-stone-800">{panel.eficiencia_pct}%</strong>
                </span>
              )}
              <span>
                Instalado em:{" "}
                <strong className="font-mono-num text-stone-800">
                  {formatDateOnly(panel.data_instalacao)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t border-stone-100 pt-4 sm:border-t-0 sm:pt-0">
            <div className="text-left sm:text-right">
              <div className="text-xs font-semibold uppercase text-stone-500">Geração Total</div>
              <div className="font-mono-num text-2xl font-extrabold text-amber-700">
                {formatKwh(panel.energia_total_kwh)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts section powered by the 2 MySQL Views */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">
              Relatório de Energia Produzida
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {activeTab === "horaria"
                ? "Consultando vw_energia_painel_horaria (últimas 72 leituras horárias)"
                : "Consultando vw_energia_painel_diaria (totais diários agregados)"}
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("horaria")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "horaria"
                  ? "bg-white text-amber-800 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Visão Horária
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("diaria")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "diaria"
                  ? "bg-white text-amber-800 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Visão Diária
            </button>
          </div>
        </div>

        <div className="mt-6 h-80 w-full">
          {activeTab === "horaria" ? (
            hourlyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">
                Nenhuma leitura horária registrada ainda. Use o simulador abaixo para inserir dados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="solarAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716C" }} minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#78716C" }}
                    unit=" kWh"
                    width={72}
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
                    }}
                  />
                  {maxKwhPerHour > 0 && (
                    <ReferenceLine
                      y={maxKwhPerHour}
                      stroke="#DC2626"
                      strokeDasharray="5 5"
                      label={{
                        value: `Limite físico (${formatNumber(maxKwhPerHour, 2)} kWh/h)`,
                        position: "insideTopRight",
                        fill: "#DC2626",
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="energia_kwh"
                    stroke="#D97706"
                    strokeWidth={2.2}
                    fill="url(#solarAmber)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          ) : dailyChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              Nenhum dado diário disponível ainda.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#78716C" }} />
                <YAxis tick={{ fontSize: 11, fill: "#78716C" }} unit=" kWh" width={72} />
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
                  }}
                />
                <Bar dataKey="energia_total_kwh" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Reading Simulator + Trigger Live Demo */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-stone-900">
                Simulador de Leitura Horária
              </h2>
              <p className="text-xs text-stone-500">
                Insere em <code className="font-mono">leituras_energia</code> e verifica alertas
                criados pela Trigger.
              </p>
            </div>
          </div>

          {/* 1-click Seminar Presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("normal")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            >
              <Sun className="h-3.5 w-3.5" />
              Preset: Leitura Normal
            </button>
            <button
              type="button"
              onClick={() => applyPreset("zero_diurno")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Preset: Zero Diurno (13h)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("acima_capacidade")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-100"
            >
              <Flame className="h-3.5 w-3.5" />
              Preset: Acima da Capacidade
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Data *</label>
                <input
                  type="date"
                  required
                  value={simDate}
                  onChange={(e) => setSimDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Hora (fechamento) *
                </label>
                <select
                  value={simHour}
                  onChange={(e) => setSimHour(e.target.value)}
                  className={`${inputClass} font-mono-num`}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Energia (kWh) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={simKwh}
                  onChange={(e) => setSimKwh(e.target.value)}
                  className={`${inputClass} font-mono-num`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simBusy}
              className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-60"
            >
              {simBusy ? "Registrando..." : "Inserir Leitura Horária"}
            </button>
          </form>

          {/* 24h Curve generator */}
          <div className="mt-5 border-t border-stone-100 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-600">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Gerar Curva Solar Completa (24h)
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="date"
                value={simDayDate}
                onChange={(e) => setSimDayDate(e.target.value)}
                className={inputClass}
              />
              <select
                value={simDayAnomaly}
                onChange={(e) =>
                  setSimDayAnomaly(
                    e.target.value as "nenhuma" | "zero_diurno" | "acima_capacidade"
                  )
                }
                className={inputClass}
              >
                <option value="nenhuma">Dia normal (sem anomalia)</option>
                <option value="zero_diurno">Injetar ZERO_DIURNO às 13h</option>
                <option value="acima_capacidade">Injetar ACIMA_CAPACIDADE às 12h</option>
              </select>
            </div>
            <button
              type="button"
              disabled={simBusy}
              onClick={handleSimulateDay}
              className="mt-2.5 w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
            >
              Gerar 24 leituras horárias para esta data
            </button>
          </div>

          {simFeedback && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
                simFeedback.kind === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : simFeedback.kind === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p className="font-bold">{simFeedback.title}</p>
              {simFeedback.alerts && simFeedback.alerts.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {simFeedback.alerts.map((al) => (
                    <li key={al.id_alerta} className="flex items-start gap-2">
                      <AlertTypeBadge tipo={al.tipo_alerta} />
                      <span>{al.mensagem}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Panel Alerts List */}
        <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-stone-900">Alertas deste Painel</h2>
              <p className="text-xs text-stone-500">
                Gerados automaticamente pela trigger em <code className="font-mono">alertas</code>.
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
              {alerts.length} total
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-500">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 font-semibold text-stone-700">Nenhum alerta registrado</p>
              <p className="mt-1 text-xs">
                Teste um dos presets de anomalia ao lado para ver a trigger em ação.
              </p>
            </div>
          ) : (
            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {alerts.map((al) => (
                <div
                  key={al.id_alerta}
                  className={`rounded-xl border p-3.5 ${
                    al.resolvido
                      ? "border-stone-200 bg-stone-50/70"
                      : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTypeBadge tipo={al.tipo_alerta} />
                      <span className="font-mono-num text-[11px] text-stone-500">
                        Leitura #{al.id_leitura}
                      </span>
                    </div>
                    {al.resolvido ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolvido
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResolveAlert(al.id_alerta)}
                        className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-stone-800"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-700">{al.mensagem}</p>
                  <div className="font-mono-num mt-2 text-[11px] text-stone-500">
                    Criado em {formatDateTime(al.criado_em)}
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
