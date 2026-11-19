import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Save, UserX } from "lucide-react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import {
  extractErrorMessage,
  formatDateTime,
  maskCep,
  maskCpf,
  UFS_BRASIL,
} from "../utils/format";

export function ProfilePage() {
  const { user, refreshUser, clearSession } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    data_nascimento: "",
    telefone: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "MG",
    cep: "",
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      nome: user.nome,
      data_nascimento: user.data_nascimento.slice(0, 10),
      telefone: user.telefone,
      logradouro: user.logradouro,
      numero: user.numero,
      complemento: user.complemento ?? "",
      bairro: user.bairro,
      cidade: user.cidade,
      uf: user.uf,
      cep: maskCep(user.cep),
    });
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      await api.updateMe({
        ...form,
        complemento: form.complemento.trim() || null,
      });
      await refreshUser();
      setFeedback("Perfil atualizado com sucesso e ação registrada na auditoria.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    setError(null);
    try {
      await api.deactivateMe();
      clearSession();
      navigate("/login");
    } catch (err) {
      setError(extractErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setDeactivating(false);
    }
  }

  if (!user) return null;

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          Tabela · usuarios
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900">Meu Perfil</h1>
        <p className="mt-1 text-sm text-stone-500">
          Atualize seus dados cadastrais e endereço de contato. CPF e e-mail são identificadores
          principais da conta.
        </p>
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

      {/* Read-only identity strip */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:grid-cols-3">
        <div>
          <div className="text-[11px] font-bold uppercase text-stone-400">CPF (PK)</div>
          <div className="font-mono-num mt-0.5 text-sm font-bold text-stone-900">
            {maskCpf(user.cpf)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase text-stone-400">E-mail (UK)</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-stone-900">{user.email}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase text-stone-400">Cadastro em</div>
          <div className="font-mono-num mt-0.5 text-sm text-stone-700">
            {formatDateTime(user.criado_em)}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Nome completo *
            </label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Data de nascimento *
            </label>
            <input
              type="date"
              required
              value={form.data_nascimento}
              onChange={(e) => setForm((p) => ({ ...p, data_nascimento: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Telefone *</label>
            <input
              required
              value={form.telefone}
              onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="border-t border-stone-100 pt-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">
            Endereço de Contato
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Logradouro *
              </label>
              <input
                required
                value={form.logradouro}
                onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-stone-700">Número *</label>
              <input
                required
                value={form.numero}
                onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-700">Complemento</label>
              <input
                value={form.complemento}
                onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-700">Bairro *</label>
              <input
                required
                value={form.bairro}
                onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-700">Cidade *</label>
              <input
                required
                value={form.cidade}
                onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
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
                className={`${inputClass} font-mono-num`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-stone-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      {/* Soft Delete / Deactivate Zone */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-rose-900">
              <AlertTriangle className="h-4 w-4" />
              Exclusão Lógica da Conta (Soft Delete)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-rose-800/90">
              Por integridade referencial (<code className="font-mono">ON DELETE RESTRICT</code>),
              contas não são apagadas fisicamente para preservar o histórico de{" "}
              <code className="font-mono">logs_auditoria</code> e geração solar. Ao desativar,{" "}
              <code className="font-mono">usuarios.ativo</code> passa para{" "}
              <code className="font-mono">FALSE</code> e o login fica bloqueado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-600 hover:text-white"
          >
            <UserX className="h-4 w-4" />
            Desativar conta
          </button>
        </div>
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar desativação da conta"
        subtitle="Esta ação marcará usuarios.ativo = FALSE e encerrará sua sessão imediatamente."
      >
        <p className="text-sm text-stone-600">
          Tem certeza que deseja desativar sua conta? Seus dados de residências, leituras e logs de
          auditoria continuarão preservados no banco, mas novos logins com este e-mail serão
          bloqueados.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deactivating}
            onClick={handleDeactivate}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {deactivating ? "Desativando..." : "Sim, desativar conta"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
