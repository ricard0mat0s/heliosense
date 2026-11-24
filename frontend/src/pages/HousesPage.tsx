import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Home, MapPin, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { api } from "../api/client";
import { CepInput } from "../components/CepInput";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { Modal } from "../components/Modal";
import { SkeletonBlock } from "../components/Skeleton";
import { useCepAutoFill } from "../hooks/useCepAutoFill";
import type { Casa, CasaPayload } from "../types";
import { extractErrorMessage, formatKwh, maskCep, UFS_BRASIL } from "../utils/format";

const emptyForm: CasaPayload = {
  nome: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "MG",
  cep: "",
};

function HousesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-busy="true" aria-label="Carregando residências">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="hs-card space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-4 w-full max-w-xs" />
            </div>
            <div className="flex gap-1.5">
              <SkeletonBlock className="h-9 w-9" />
              <SkeletonBlock className="h-9 w-9" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-16" />
              <SkeletonBlock className="h-6 w-12" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-6 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HousesPage() {
  const [casas, setCasas] = useState<Casa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Casa | null>(null);
  const [form, setForm] = useState<CasaPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    cepStatus,
    cepMessage,
    cepTouched,
    handleCepChange,
    handleCepBlur,
    resetCepLookup,
  } = useCepAutoFill(setForm);

  const [deletingTarget, setDeletingTarget] = useState<Casa | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  async function loadCasas() {
    setLoading(true);
    setError(null);
    try {
      setCasas(await api.listCasas());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCasas();
  }, []);

  const closeModal = useCallback(() => {
    resetCepLookup();
    setModalOpen(false);
  }, [resetCepLookup]);

  function openCreate() {
    resetCepLookup();
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(casa: Casa) {
    resetCepLookup();
    setEditing(casa);
    setForm({
      nome: casa.nome ?? "",
      logradouro: casa.logradouro,
      numero: casa.numero,
      complemento: casa.complemento ?? "",
      bairro: casa.bairro,
      cidade: casa.cidade,
      uf: casa.uf,
      cep: maskCep(casa.cep),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload: CasaPayload = {
        ...form,
        nome: form.nome?.trim() || null,
        complemento: form.complemento?.trim() || null,
      };
      if (editing) {
        await api.updateCasa(editing.id_casa, payload);
        setFeedback("Residência atualizada com sucesso.");
      } else {
        await api.createCasa(payload);
        setFeedback("Nova residência cadastrada com sucesso.");
      }
      closeModal();
      await loadCasas();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingTarget) return;
    setError(null);
    setFeedback(null);
    setDeletingBusy(true);
    const label = deletingTarget.nome || `Residência #${deletingTarget.id_casa}`;
    try {
      await api.deleteCasa(deletingTarget.id_casa);
      setFeedback(`"${label}" foi excluída com sucesso.`);
      setDeletingTarget(null);
      await loadCasas();
    } catch (err) {
      setError(extractErrorMessage(err));
      setDeletingTarget(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  const targetLabel = deletingTarget
    ? deletingTarget.nome || `Residência #${deletingTarget.id_casa}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
            Minhas Residências
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Cadastre os imóveis onde seus painéis solares estão instalados. Para excluir uma
            residência, remova antes os painéis vinculados a ela.
          </p>
        </div>

        <button type="button" onClick={openCreate} className="hs-btn-primary shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova residência
        </button>
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
        <HousesSkeleton />
      ) : casas.length === 0 ? (
        <div className="hs-card border-dashed border-stone-300 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Home className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900">Nenhuma residência cadastrada</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">
            Adicione seu primeiro imóvel para começar a organizar e monitorar seus painéis solares.
          </p>
          <button type="button" onClick={openCreate} className="hs-btn-primary mt-5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Cadastrar primeira residência
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {casas.map((casa) => {
            const label = casa.nome || `Residência #${casa.id_casa}`;
            return (
              <article key={casa.id_casa} className="hs-card flex flex-col justify-between p-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-extrabold tracking-tight text-stone-900">
                        {label}
                      </h2>
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-relaxed text-stone-600">
                        <MapPin
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                          aria-hidden="true"
                        />
                        <span>
                          {casa.logradouro}, {casa.numero}
                          {casa.complemento ? ` — ${casa.complemento}` : ""} · {casa.bairro},{" "}
                          {casa.cidade}/{casa.uf} · CEP{" "}
                          <span className="font-mono-num">{maskCep(casa.cep)}</span>
                        </span>
                      </p>
                    </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(casa)}
                      className="hs-icon-btn"
                      aria-label={`Editar ${label}`}
                      title="Editar residência"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTarget(casa)}
                      className="hs-icon-btn hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Excluir ${label}`}
                      title="Excluir residência"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <dl className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                      <Cpu className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                      Painéis instalados
                    </dt>
                    <dd className="font-mono-num mt-1 text-lg font-extrabold text-stone-900">
                      {casa.qtd_paineis}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                      <Zap className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      Geração total
                    </dt>
                    <dd className="font-mono-num mt-1 text-lg font-extrabold text-stone-900">
                      {formatKwh(casa.energia_total_kwh)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex justify-end border-t border-stone-100 pt-3.5">
                  <Link
                    to={`/paineis?casa=${casa.id_casa}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:underline"
                  >
                    Ver painéis desta residência
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar residência" : "Nova residência"}
        subtitle="Informe o endereço onde os painéis solares estão instalados."
        maxWidthClass="max-w-xl"
      >
        {formError && (
          <FeedbackBanner tone="error" className="mb-4" onDismiss={() => setFormError(null)}>
            {formError}
          </FeedbackBanner>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="house-nome" className="hs-label">
              Nome ou apelido (opcional)
            </label>
            <input
              id="house-nome"
              value={form.nome ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex.: Residência Principal, Casa de Campo"
              className="hs-input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <CepInput
                id="house-cep"
                value={form.cep}
                status={cepStatus}
                message={cepMessage}
                touched={cepTouched}
                onChange={handleCepChange}
                onBlur={handleCepBlur}
              />
            </div>

            <div className="sm:col-span-8">
              <label htmlFor="house-logradouro" className="hs-label">
                Logradouro *
              </label>
              <input
                id="house-logradouro"
                required
                autoComplete="street-address"
                value={form.logradouro}
                onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))}
                placeholder="Rua, Avenida..."
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="house-numero" className="hs-label">
                Número *
              </label>
              <input
                id="house-numero"
                required
                value={form.numero}
                onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                placeholder="123"
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-8">
              <label htmlFor="house-complemento" className="hs-label">
                Complemento
              </label>
              <input
                id="house-complemento"
                value={form.complemento ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))}
                placeholder="Opcional"
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="house-bairro" className="hs-label">
                Bairro *
              </label>
              <input
                id="house-bairro"
                required
                value={form.bairro}
                onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                placeholder="Ex.: Centro"
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="house-cidade" className="hs-label">
                Cidade *
              </label>
              <input
                id="house-cidade"
                required
                autoComplete="address-level2"
                value={form.cidade}
                onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                placeholder="Montes Claros"
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="house-uf" className="hs-label">
                UF *
              </label>
              <select
                id="house-uf"
                value={form.uf}
                onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value }))}
                className="hs-select"
              >
                {UFS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="hs-btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="hs-btn-primary">
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar residência"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingTarget)}
        title="Excluir residência"
        subtitle={targetLabel}
        description={`Tem certeza que deseja excluir "${targetLabel}"? Residências que ainda possuem painéis instalados não podem ser removidas antes da desvinculação dos módulos.`}
        confirmLabel="Excluir residência"
        busyLabel="Excluindo..."
        busy={deletingBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeletingTarget(null)}
      />
    </div>
  );
}
