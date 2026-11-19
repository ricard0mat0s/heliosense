import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Cpu,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Modal } from "../components/Modal";
import { SkeletonTable } from "../components/Skeleton";
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

  // Delete confirmation state
  const [deletingPanel, setDeletingPanel] = useState<Painel | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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
    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("casa");
    } else {
      next.set("casa", value);
    }
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    handleHouseFilterChange("all");
    setStatusFilter("all");
  }

  function openCreatePanel() {
    setEditingPanel(null);
    setPanelForm({
      id_casa: houseFilter !== "all" ? Number(houseFilter) : (casas[0]?.id_casa ?? 0),
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
      setPanelFormError("Selecione uma residência e um modelo de painel.");
      return;
    }
    setSavingPanel(true);
    try {
      if (editingPanel) {
        await api.updatePainel(editingPanel.id_painel, panelForm);
        setFeedback(`Painel ${panelForm.numero_serie} atualizado com sucesso.`);
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

  async function confirmDeletePanel() {
    if (!deletingPanel) return;
    setError(null);
    setFeedback(null);
    setDeletingBusy(true);
    try {
      await api.deletePainel(deletingPanel.id_painel);
      setFeedback(`Painel ${deletingPanel.numero_serie} excluído com sucesso.`);
      setDeletingPanel(null);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeletingPanel(null);
    } finally {
      setDeletingBusy(false);
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

  const hasActiveFilters = houseFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Painéis Solares
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Gerencie seus módulos instalados e abra qualquer painel para analisar os gráficos
            horário e diário ou simular leituras.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              setModelFormError(null);
              setModelModalOpen(true);
            }}
            className="hs-btn-secondary"
          >
            <Layers className="h-4 w-4 text-amber-700" aria-hidden="true" />
            Novo modelo
          </button>
          <button
            type="button"
            onClick={openCreatePanel}
            disabled={casas.length === 0}
            className="hs-btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo painel
          </button>
        </div>
      </div>

      {casas.length === 0 && !loading && (
        <FeedbackBanner tone="warning">
          Cadastre ao menos uma residência em{" "}
          <Link to="/casas" className="font-bold underline">
            Residências
          </Link>{" "}
          antes de adicionar painéis solares.
        </FeedbackBanner>
      )}

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

      {/* Filters */}
      <div className="hs-card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="filter-house" className="hs-label">
            Residência
          </label>
          <select
            id="filter-house"
            value={houseFilter}
            onChange={(e) => handleHouseFilterChange(e.target.value)}
            className="hs-select"
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
          <label htmlFor="filter-status" className="hs-label">
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="hs-select"
          >
            <option value="all">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="manutencao">Manutenção</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pb-1 text-xs text-stone-500">
          {!loading && (
            <span className="font-mono-num">
              {filteredPanels.length} de {paineis.length}
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-amber-800 transition hover:bg-amber-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : filteredPanels.length === 0 ? (
        <div className="hs-card border-dashed border-stone-300 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900">Nenhum painel encontrado</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
            {hasActiveFilters
              ? "Nenhum painel corresponde aos filtros aplicados no momento."
              : "Cadastre seu primeiro painel solar para começar a registrar e monitorar leituras."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters} className="hs-btn-secondary">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Limpar filtros
              </button>
            ) : casas.length > 0 ? (
              <button type="button" onClick={openCreatePanel} className="hs-btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Cadastrar primeiro painel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="hs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-bold uppercase tracking-wide text-stone-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Número de série
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Residência
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Modelo / Potência
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Instalação
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Produção total
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPanels.map((panel) => (
                  <tr key={panel.id_painel} className="transition-colors hover:bg-amber-50/35">
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        to={`/paineis/${panel.id_painel}`}
                        className="group inline-flex items-center gap-1.5 whitespace-nowrap font-mono-num font-bold text-stone-900 hover:text-amber-800"
                      >
                        {panel.numero_serie}
                        <ArrowUpRight
                          className="h-3.5 w-3.5 text-stone-500 group-hover:text-amber-700"
                          aria-hidden="true"
                        />
                      </Link>
                      {panel.alertas_abertos > 0 && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {panel.alertas_abertos}{" "}
                            {panel.alertas_abertos === 1 ? "alerta" : "alertas"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-stone-700">
                      {panel.nome_casa || `Residência #${panel.id_casa}`}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-stone-900">
                        {panel.marca} · {panel.nome_modelo}
                      </div>
                      <div className="font-mono-num mt-0.5 text-xs text-stone-500">
                        {panel.potencia_max_w} W
                        {panel.eficiencia_pct ? ` · ${panel.eficiencia_pct}% efic.` : ""}
                      </div>
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-5 py-4 text-xs text-stone-600">
                      {formatDateOnly(panel.data_instalacao)}
                    </td>
                    <td className="px-5 py-4">
                      <PanelStatusBadge status={panel.status} />
                    </td>
                    <td className="font-mono-num whitespace-nowrap px-5 py-4 text-right font-bold text-stone-900">
                      {formatKwh(panel.energia_total_kwh)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/paineis/${panel.id_painel}`}
                          className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200/80 transition hover:bg-amber-100"
                        >
                          Relatórios
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditPanel(panel)}
                          className="hs-icon-btn"
                          aria-label={`Editar painel ${panel.numero_serie}`}
                          title="Editar painel"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingPanel(panel)}
                          className="hs-icon-btn hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Excluir painel ${panel.numero_serie}`}
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
        title={editingPanel ? `Editar painel ${editingPanel.numero_serie}` : "Novo painel solar"}
        subtitle="Associe o módulo a uma residência e a um modelo técnico do catálogo."
      >
        {panelFormError && (
          <FeedbackBanner tone="error" className="mb-4" onDismiss={() => setPanelFormError(null)}>
            {panelFormError}
          </FeedbackBanner>
        )}

        <form onSubmit={handleSavePanel} className="space-y-4">
          <div>
            <label htmlFor="panel-house" className="hs-label">
              Residência *
            </label>
            <select
              id="panel-house"
              required
              value={panelForm.id_casa}
              onChange={(e) => setPanelForm((p) => ({ ...p, id_casa: Number(e.target.value) }))}
              className="hs-select"
            >
              {casas.map((c) => (
                <option key={c.id_casa} value={c.id_casa}>
                  {c.nome || `Residência #${c.id_casa}`} — {c.cidade}/{c.uf}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="panel-model" className="text-xs font-semibold text-stone-700">
                Modelo do painel *
              </label>
              <button
                type="button"
                onClick={() => {
                  setModelFormError(null);
                  setModelModalOpen(true);
                }}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                + Cadastrar novo modelo
              </button>
            </div>
            <select
              id="panel-model"
              required
              value={panelForm.id_modelo}
              onChange={(e) => setPanelForm((p) => ({ ...p, id_modelo: Number(e.target.value) }))}
              className="hs-select"
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
            <label htmlFor="panel-serial" className="hs-label">
              Número de série (único do fabricante) *
            </label>
            <input
              id="panel-serial"
              required
              value={panelForm.numero_serie}
              onChange={(e) => setPanelForm((p) => ({ ...p, numero_serie: e.target.value }))}
              placeholder="Ex.: CS-550-MG-0009"
              className="hs-input font-mono-num uppercase"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="panel-date" className="hs-label">
                Data de instalação *
              </label>
              <input
                id="panel-date"
                type="date"
                required
                value={panelForm.data_instalacao}
                onChange={(e) => setPanelForm((p) => ({ ...p, data_instalacao: e.target.value }))}
                className="hs-input"
              />
            </div>
            <div>
              <label htmlFor="panel-status" className="hs-label">
                Status *
              </label>
              <select
                id="panel-status"
                value={panelForm.status}
                onChange={(e) =>
                  setPanelForm((p) => ({ ...p, status: e.target.value as StatusPainel }))
                }
                className="hs-select"
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
              className="hs-btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingPanel} className="hs-btn-primary">
              {savingPanel
                ? "Salvando..."
                : editingPanel
                  ? "Salvar alterações"
                  : "Cadastrar painel"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Panel Model */}
      <Modal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        title="Cadastrar modelo de painel"
        subtitle="Cadastre as especificações técnicas do módulo. A potência máxima define o limite esperado de geração por hora."
      >
        {modelFormError && (
          <FeedbackBanner tone="error" className="mb-4" onDismiss={() => setModelFormError(null)}>
            {modelFormError}
          </FeedbackBanner>
        )}

        <form onSubmit={handleSaveModel} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="model-marca" className="hs-label">
                Marca *
              </label>
              <input
                id="model-marca"
                required
                value={modelForm.marca}
                onChange={(e) => setModelForm((p) => ({ ...p, marca: e.target.value }))}
                placeholder="Ex.: Canadian Solar"
                className="hs-input"
              />
            </div>
            <div>
              <label htmlFor="model-nome" className="hs-label">
                Nome do modelo *
              </label>
              <input
                id="model-nome"
                required
                value={modelForm.nome_modelo}
                onChange={(e) => setModelForm((p) => ({ ...p, nome_modelo: e.target.value }))}
                placeholder="Ex.: HiKu7 600W"
                className="hs-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="model-potencia" className="hs-label">
                Potência máxima (Watts) *
              </label>
              <input
                id="model-potencia"
                type="number"
                required
                min={1}
                max={50000}
                value={modelForm.potencia_max_w}
                onChange={(e) => setModelForm((p) => ({ ...p, potencia_max_w: e.target.value }))}
                className="hs-input font-mono-num"
              />
            </div>
            <div>
              <label htmlFor="model-eficiencia" className="hs-label">
                Eficiência (%) — opcional
              </label>
              <input
                id="model-eficiencia"
                type="number"
                step="0.01"
                min={1}
                max={100}
                value={modelForm.eficiencia_pct}
                onChange={(e) => setModelForm((p) => ({ ...p, eficiencia_pct: e.target.value }))}
                className="hs-input font-mono-num"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setModelModalOpen(false)}
              className="hs-btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={savingModel} className="hs-btn-primary">
              {savingModel ? "Salvando..." : "Adicionar modelo"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingPanel)}
        title="Excluir painel solar"
        subtitle={deletingPanel?.numero_serie}
        description={`Tem certeza que deseja excluir o painel ${deletingPanel?.numero_serie ?? ""}? Painéis que já possuem histórico de leituras registradas não podem ser removidos.`}
        confirmLabel="Excluir painel"
        busyLabel="Excluindo..."
        busy={deletingBusy}
        onConfirm={confirmDeletePanel}
        onClose={() => setDeletingPanel(null)}
      />
    </div>
  );
}
