import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { PanelStatusBadge } from "../components/StatusBadge";
import type { Casa, ModeloPainel, Painel, PainelPayload, StatusPainel } from "../types";
import {
  extractErrorMessage,
  formatDateOnly,
  formatKwh,
  toLocalDateString,
} from "../utils/format";

export function PanelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHouseFilter = searchParams.get("casa") ?? "all";

  const [paineis, setPaineis] = useState<Painel[]>([]);
  const [casas, setCasas] = useState<Casa[]>([]);
  const [modelos, setModelos] = useState<ModeloPainel[]>([]);
  const [houseFilter, setHouseFilter] = useState<string>(initialHouseFilter);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Panel modal state
  const [panelModalOpen, setPanelModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Painel | null>(null);
  const [panelForm, setPanelForm] = useState<PainelPayload>({
    id_casa: 0,
    id_modelo: 0,
    numero_serie: "",
    data_instalacao: toLocalDateString(new Date()),
    status: "ativo",
  });
  const [panelFormError, setPanelFormError] = useState<string | null>(null);
  const [savingPanel, setSavingPanel] = useState(false);

  // Model catalog modal state
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelForm, setModelForm] = useState({
    marca: "",
    nome_modelo: "",
    potencia_max_w: "550",
    eficiencia_pct: "21.5",
  });
  const [modelFormError, setModelFormError] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [pData, cData, mData] = await Promise.all([
        api.listPaineis(),
        api.listCasas(),
        api.listModelos(),
      ]);
      setPaineis(pData);
      setCasas(cData);
      setModelos(mData);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleHouseFilterChange(value: string) {
    setHouseFilter(value);
    if (value === "all") {
      searchParams.delete("casa");
    } else {
      searchParams.set("casa", value);
    }
    setSearchParams(searchParams, { replace: true });
  }

  function openCreatePanel() {
    setEditingPanel(null);
    setPanelForm({
      id_casa:
        houseFilter !== "all" ? Number(houseFilter) : (casas[0]?.id_casa ?? 0),
      id_modelo: modelos[0]?.id_modelo ?? 0,
      numero_serie: "",
      data_instalacao: toLocalDateString(new Date()),
      status: "ativo",
    });
    setPanelFormError(null);
    setPanelModalOpen(true);
  }

  function openEditPanel(panel: Painel) {
    setEditingPanel(panel);
    setPanelForm({
      id_casa: panel.id_casa,
      id_modelo: panel.id_modelo,
      numero_serie: panel.numero_serie,
      data_instalacao: panel.data_instalacao.slice(0, 10),
      status: panel.status,
    });
    setPanelFormError(null);
    setPanelModalOpen(true);
  }

  async function handleSavePanel(e: FormEvent) {
    e.preventDefault();
    setPanelFormError(null);
    if (!panelForm.id_casa || !panelForm.id_modelo) {
      setPanelFormError("Selecione uma casa e um modelo de painel.");
      return;
    }
    setSavingPanel(true);
    try {
      if (editingPanel) {
        await api.updatePainel(editingPanel.id_painel, panelForm);
        setFeedback(`Painel ${panelForm.numero_serie} atualizado.`);
      } else {
        await api.createPainel(panelForm);
        setFeedback(`Painel ${panelForm.numero_serie} cadastrado com sucesso.`);
      }
      setPanelModalOpen(false);
      await loadAll();
    } catch (err) {
      setPanelFormError(extractErrorMessage(err));
    } finally {
      setSavingPanel(false);
    }
  }

  async function handleDeletePanel(panel: Painel) {
    setError(null);
    setFeedback(null);
    if (!window.confirm(`Deseja excluir o painel ${panel.numero_serie}?`)) return;
    try {
      await api.deletePainel(panel.id_painel);
      setFeedback(`Painel ${panel.numero_serie} excluído.`);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function handleSaveModel(e: FormEvent) {
    e.preventDefault();
    setModelFormError(null);
    setSavingModel(true);
    try {
      const created = await api.createModelo({
        marca: modelForm.marca,
        nome_modelo: modelForm.nome_modelo,
        potencia_max_w: Number(modelForm.potencia_max_w),
        eficiencia_pct: modelForm.eficiencia_pct ? Number(modelForm.eficiencia_pct) : null,
      });
      setModelModalOpen(false);
      setModelForm({ marca: "", nome_modelo: "", potencia_max_w: "550", eficiencia_pct: "21.5" });
      setFeedback(`Modelo ${created.marca} ${created.nome_modelo} adicionado ao catálogo.`);
      await loadAll();
      if (panelModalOpen) {
        setPanelForm((prev) => ({ ...prev, id_modelo: created.id_modelo }));
      }
    } catch (err) {
      setModelFormError(extractErrorMessage(err));
    } finally {
      setSavingModel(false);
    }
  }

  const filteredPanels = paineis.filter((p) => {
    if (houseFilter !== "all" && p.id_casa !== Number(houseFilter)) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Tabelas · paineis &amp; modelos_paineis
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">
            Painéis Solares
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Gerencie seus módulos instalados e clique em qualquer painel para analisar os gráficos
            horário/diário e simular leituras.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              setModelFormError(null);
              setModelModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50"
          >
            <Layers className="h-4 w-4 text-amber-600" />
            Novo Modelo
          </button>
          <button
            type="button"
            onClick={openCreatePanel}
            disabled={casas.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Novo Painel
          </button>
        </div>
      </div>

      {casas.length === 0 && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cadastre ao menos uma residência em{" "}
          <Link to="/casas" className="font-bold underline">
            Casas
          </Link>{" "}
          antes de adicionar painéis solares.
        </div>
      )}

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-stone-500">
            Filtrar por residência
          </label>
          <select
            value={houseFilter}
            onChange={(e) => handleHouseFilterChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todas as residências</option>
            {casas.map((c) => (
              <option key={c.id_casa} value={String(c.id_casa)}>
                {c.nome || `Residência #${c.id_casa}`}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs font-semibold text-stone-500">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="manutencao">Manutenção</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Carregando painéis...
        </div>
      ) : filteredPanels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Cpu className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">Nenhum painel encontrado</h2>
          <p className="mt-1 text-sm text-stone-500">
            Ajuste os filtros ou cadastre um novo painel solar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-bold uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3.5">Número de Série</th>
                  <th className="px-5 py-3.5">Residência</th>
                  <th className="px-5 py-3.5">Modelo / Potência</th>
                  <th className="px-5 py-3.5">Instalação</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Produção Total</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPanels.map((panel) => (
                  <tr key={panel.id_painel} className="transition hover:bg-amber-50/30">
                    <td className="px-5 py-4">
                      <Link
                        to={`/paineis/${panel.id_painel}`}
                        className="group inline-flex items-center gap-1.5 font-mono-num font-bold text-stone-900 hover:text-amber-700"
                      >
                        {panel.numero_serie}
                        <ArrowUpRight className="h-3.5 w-3.5 text-stone-400 group-hover:text-amber-600" />
                      </Link>
                      {panel.alertas_abertos > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          <AlertTriangle className="h-3 w-3" />
                          {panel.alertas_abertos} alerta(s)
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-stone-700">
                      {panel.nome_casa || `Residência #${panel.id_casa}`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-stone-800">
                        {panel.marca} · {panel.nome_modelo}
                      </div>
                      <div className="font-mono-num text-xs text-stone-500">
                        {panel.potencia_max_w} W
                        {panel.eficiencia_pct ? ` · ${panel.eficiencia_pct}% efic.` : ""}
                      </div>
                    </td>
                    <td className="font-mono-num px-5 py-4 text-xs text-stone-600">
                      {formatDateOnly(panel.data_instalacao)}
                    </td>
                    <td className="px-5 py-4">
                      <PanelStatusBadge status={panel.status} />
                    </td>
                    <td className="font-mono-num px-5 py-4 text-right font-bold text-stone-900">
                      {formatKwh(panel.energia_total_kwh)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/paineis/${panel.id_painel}`}
                          className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                        >
                          Relatórios
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditPanel(panel)}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                          title="Editar painel"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePanel(panel)}
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Excluir painel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Panel */}
      <Modal
        open={panelModalOpen}
        onClose={() => setPanelModalOpen(false)}
        title={editingPanel ? `Editar Painel ${editingPanel.numero_serie}` : "Novo Painel Solar"}
        subtitle="Associe o módulo a uma residência e a um modelo técnico do catálogo."
      >
        {panelFormError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
            {panelFormError}
          </div>
        )}

        <form onSubmit={handleSavePanel} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Residência *</label>
            <select
              required
              value={panelForm.id_casa}
              onChange={(e) => setPanelForm((p) => ({ ...p, id_casa: Number(e.target.value) }))}
              className={inputClass}
            >
              {casas.map((c) => (
                <option key={c.id_casa} value={c.id_casa}>
                  {c.nome || `Residência #${c.id_casa}`} — {c.cidade}/{c.uf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700">Modelo do Painel *</label>
              <button
                type="button"
                onClick={() => {
                  setModelFormError(null);
                  setModelModalOpen(true);
                }}
                className="text-xs font-bold text-amber-700 hover:underline"
              >
                + Cadastrar novo modelo
              </button>
            </div>
            <select
              required
              value={panelForm.id_modelo}
              onChange={(e) => setPanelForm((p) => ({ ...p, id_modelo: Number(e.target.value) }))}
              className={inputClass}
            >
              {modelos.length === 0 && <option value={0}>Nenhum modelo cadastrado</option>}
              {modelos.map((m) => (
                <option key={m.id_modelo} value={m.id_modelo}>
                  {m.marca} — {m.nome_modelo} ({m.potencia_max_w}W)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Número de Série (único do fabricante) *
            </label>
            <input
              required
              value={panelForm.numero_serie}
              onChange={(e) => setPanelForm((p) => ({ ...p, numero_serie: e.target.value }))}
              placeholder="Ex.: CS-550-MG-0009"
              className={`${inputClass} font-mono-num uppercase`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Data de Instalação *
              </label>
              <input
                type="date"
                required
                value={panelForm.data_instalacao}
                onChange={(e) => setPanelForm((p) => ({ ...p, data_instalacao: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Status *</label>
              <select
                value={panelForm.status}
                onChange={(e) =>
                  setPanelForm((p) => ({ ...p, status: e.target.value as StatusPainel }))
                }
                className={inputClass}
              >
                <option value="ativo">Ativo</option>
                <option value="manutencao">Manutenção</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setPanelModalOpen(false)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingPanel}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {savingPanel ? "Salvando..." : editingPanel ? "Salvar alterações" : "Cadastrar painel"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Panel Model */}
      <Modal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        title="Cadastrar Modelo de Painel"
        subtitle="Catálogo técnico compartilhado (modelos_paineis). A potência máxima (W) define o teto da trigger ACIMA_CAPACIDADE."
      >
        {modelFormError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
            {modelFormError}
          </div>
        )}

        <form onSubmit={handleSaveModel} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Marca *</label>
              <input
                required
                value={modelForm.marca}
                onChange={(e) => setModelForm((p) => ({ ...p, marca: e.target.value }))}
                placeholder="Ex.: Canadian Solar"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Nome do Modelo *
              </label>
              <input
                required
                value={modelForm.nome_modelo}
                onChange={(e) => setModelForm((p) => ({ ...p, nome_modelo: e.target.value }))}
                placeholder="Ex.: HiKu7 600W"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Potência Máxima (Watts) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={50000}
                value={modelForm.potencia_max_w}
                onChange={(e) => setModelForm((p) => ({ ...p, potencia_max_w: e.target.value }))}
                className={`${inputClass} font-mono-num`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Eficiência (%) — opcional
              </label>
              <input
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={modelForm.eficiencia_pct}
                onChange={(e) => setModelForm((p) => ({ ...p, eficiencia_pct: e.target.value }))}
                className={`${inputClass} font-mono-num`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setModelModalOpen(false)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingModel}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {savingModel ? "Salvando..." : "Adicionar modelo"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
