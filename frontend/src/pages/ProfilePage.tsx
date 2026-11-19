import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Save, UserX } from "lucide-react";
import { api } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { useAuth } from "../context/AuthContext";
import {
  extractErrorMessage,
  formatDateOnly,
  maskCep,
  maskCpf,
  maskPhone,
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
      telefone: maskPhone(user.telefone),
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
      setFeedback("Dados do perfil atualizados com sucesso.");
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Meu Perfil</h1>
        <p className="mt-1 text-sm text-stone-600">
          Atualize seus dados cadastrais e endereço de contato. CPF e e-mail são identificadores
          fixos da sua conta.
        </p>
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

      {/* Read-only identity strip */}
      <dl className="hs-card grid grid-cols-1 divide-y divide-stone-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:p-5">
          <dt className="text-xs font-semibold text-stone-500">CPF</dt>
          <dd className="font-mono-num mt-1 text-sm font-bold text-stone-900">
            {maskCpf(user.cpf)}
          </dd>
        </div>
        <div className="p-4 sm:p-5">
          <dt className="text-xs font-semibold text-stone-500">E-mail de acesso</dt>
          <dd className="mt-1 truncate text-sm font-semibold text-stone-900">{user.email}</dd>
        </div>
        <div className="p-4 sm:p-5">
          <dt className="text-xs font-semibold text-stone-500">Cliente desde</dt>
          <dd className="font-mono-num mt-1 text-sm font-medium text-stone-800">
            {formatDateOnly(user.criado_em)}
          </dd>
        </div>
      </dl>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="hs-card space-y-6 p-6">
        <fieldset className="space-y-4">
          <legend className="text-base font-bold tracking-tight text-stone-900">
            Dados pessoais
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="profile-nome" className="hs-label">
                Nome completo *
              </label>
              <input
                id="profile-nome"
                required
                autoComplete="name"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div>
              <label htmlFor="profile-nasc" className="hs-label">
                Data de nascimento *
              </label>
              <input
                id="profile-nasc"
                type="date"
                required
                autoComplete="bday"
                value={form.data_nascimento}
                onChange={(e) => setForm((p) => ({ ...p, data_nascimento: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div>
              <label htmlFor="profile-telefone" className="hs-label">
                Telefone *
              </label>
              <input
                id="profile-telefone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))}
                className="hs-input font-mono-num"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-stone-100 pt-5">
          <legend className="text-base font-bold tracking-tight text-stone-900">
            Endereço de contato
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="profile-logradouro" className="hs-label">
                Logradouro *
              </label>
              <input
                id="profile-logradouro"
                required
                autoComplete="street-address"
                value={form.logradouro}
                onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="profile-numero" className="hs-label">
                Número *
              </label>
              <input
                id="profile-numero"
                required
                value={form.numero}
                onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="profile-complemento" className="hs-label">
                Complemento
              </label>
              <input
                id="profile-complemento"
                value={form.complemento}
                onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))}
                placeholder="Opcional"
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="profile-bairro" className="hs-label">
                Bairro *
              </label>
              <input
                id="profile-bairro"
                required
                value={form.bairro}
                onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="profile-cidade" className="hs-label">
                Cidade *
              </label>
              <input
                id="profile-cidade"
                required
                autoComplete="address-level2"
                value={form.cidade}
                onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))}
                className="hs-input"
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="profile-uf" className="hs-label">
                UF *
              </label>
              <select
                id="profile-uf"
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

            <div className="sm:col-span-2">
              <label htmlFor="profile-cep" className="hs-label">
                CEP *
              </label>
              <input
                id="profile-cep"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.cep}
                onChange={(e) => setForm((p) => ({ ...p, cep: maskCep(e.target.value) }))}
                className="hs-input font-mono-num"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end border-t border-stone-100 pt-4">
          <button type="submit" disabled={saving} className="hs-btn-primary">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      {/* Deactivate Account Zone */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/55 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-rose-950">
              <AlertTriangle className="h-4 w-4 text-rose-700" aria-hidden="true" />
              Desativar conta
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-rose-900">
              Ao desativar sua conta, o acesso com este e-mail é bloqueado imediatamente. Seu
              histórico de geração solar, residências e registros de segurança continuam preservados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="hs-btn-danger-outline shrink-0 text-xs"
          >
            <UserX className="h-4 w-4" aria-hidden="true" />
            Desativar conta
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar desativação da conta"
        subtitle="Sua sessão será encerrada imediatamente após a confirmação."
        description="Tem certeza que deseja desativar sua conta? Seus dados de residências, leituras e histórico de auditoria continuarão preservados, mas novos acessos com este e-mail ficarão bloqueados."
        confirmLabel="Sim, desativar conta"
        busyLabel="Desativando..."
        busy={deactivating}
        onConfirm={handleDeactivate}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
