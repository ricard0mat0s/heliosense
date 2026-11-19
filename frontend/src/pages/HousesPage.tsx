import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Cpu, Home, MapPin, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(casa: Casa) {
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
      setModalOpen(false);
      await loadCasas();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(casa: Casa) {
    setError(null);
    setFeedback(null);
    const label = casa.nome || `Residência #${casa.id_casa}`;
    if (!window.confirm(`Deseja realmente excluir "${label}"?`)) return;

    try {
      await api.deleteCasa(casa.id_casa);
      setFeedback(`"${label}" excluída com sucesso.`);
      await loadCasas();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Tabela · casas
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">
            Minhas Residências
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Cadastre os imóveis onde seus painéis solares estão instalados. Casas com painéis
            vinculados são protegidas por <code className="font-mono text-xs">ON DELETE RESTRICT</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Nova Residência
        </button>
      </div>

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

      {loading ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
          Carregando residências...
        </div>
      ) : casas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
          <Home className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">Nenhuma casa cadastrada</h2>
          <p className="mt-1 text-sm text-stone-500">
            Adicione sua primeira residência para começar a registrar painéis solares.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {casas.map((casa) => (
            <div
              key={casa.id_casa}
              className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-stone-900">
                      {casa.nome || `Residência #${casa.id_casa}`}
                    </h2>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>
                        {casa.logradouro}, {casa.numero}
                        {casa.complemento ? ` — ${casa.complemento}` : ""} · {casa.bairro},{" "}
                        {casa.cidade}/{casa.uf} · CEP{" "}
                        <span className="font-mono-num">{maskCep(casa.cep)}</span>
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(casa)}
                      className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                      title="Editar residência"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(casa)}
                      className="rounded-lg p-2 text-stone-500 transition hover:bg-rose-50 hover:text-rose-700"
                      title="Excluir residência"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#FAF8F5] p-3.5 ring-1 ring-stone-200/70">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                      <Cpu className="h-3.5 w-3.5 text-amber-600" />
                      Painéis
                    </div>
                    <div className="font-mono-num mt-1 text-lg font-extrabold text-stone-900">
                      {casa.qtd_paineis}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                      <Zap className="h-3.5 w-3.5 text-emerald-600" />
                      Geração Total
                    </div>
                    <div className="font-mono-num mt-1 text-lg font-extrabold text-stone-900">
                      {formatKwh(casa.energia_total_kwh)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end border-t border-stone-100 pt-3">
                <Link
                  to={`/paineis?casa=${casa.id_casa}`}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                >
                  Ver painéis desta casa →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Residência" : "Nova Residência"}
        subtitle="Informe o endereço onde os painéis solares estão instalados."
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">
            {formError}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Nome / Apelido (opcional)
            </label>
            <input
              value={form.nome ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex.: Residência Principal, Casa de Campo"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Logradouro *
              </label>
              <input
                required
                value={form.logradouro}
                onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))}
                placeholder="Rua, Avenida..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Número *</label>
              <input
                required
                value={form.numero}
                onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                placeholder="123"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Complemento</label>
              <input
                value={form.complemento ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Bairro *</label>
              <input
                required
                value={form.bairro}
                onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                placeholder="Bairro"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-700">Cidade *</label>
              <input
                required
                value={form.cidade}
                onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                placeholder="Montes Claros"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-stone-700">UF *</label>
              <select
                value={form.uf}
                onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value }))}
                className={inputClass}
              >
                {UFS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-stone-700">CEP *</label>
              <input
                required
                value={form.cep}
                onChange={(e) => setForm((p) => ({ ...p, cep: maskCep(e.target.value) }))}
                placeholder="39400-000"
                className={`${inputClass} font-mono-num`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar casa"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
