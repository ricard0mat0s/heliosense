import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage, maskCep, maskCpf, UFS_BRASIL } from "../utils/format";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    data_nascimento: "",
    email: "",
    senha: "",
    telefone: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "MG",
    cep: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        ...form,
        complemento: form.complemento.trim() || null,
      });
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-stone-900">Cadastro Residencial</h1>
              <p className="text-xs text-stone-500">Crie sua conta no HelioSense</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Dados Pessoais */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700">
              Dados Pessoais e Acesso
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Nome completo *
                </label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Ex.: Ana Paula Ferreira"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">CPF *</label>
                <input
                  required
                  value={form.cpf}
                  onChange={(e) => updateField("cpf", maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className={`${inputClass} font-mono-num`}
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
                  onChange={(e) => updateField("data_nascimento", e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">E-mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="voce@exemplo.com.br"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Telefone *
                </label>
                <input
                  required
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  placeholder="(38) 99999-0000"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Senha (mín. 6 caracteres) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.senha}
                  onChange={(e) => updateField("senha", e.target.value)}
                  placeholder="Crie uma senha forte"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Endereço de Contato */}
          <div className="border-t border-stone-100 pt-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700">
              Endereço de Contato
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Logradouro *
                </label>
                <input
                  required
                  value={form.logradouro}
                  onChange={(e) => updateField("logradouro", e.target.value)}
                  placeholder="Rua, Avenida..."
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-stone-700">Número *</label>
                <input
                  required
                  value={form.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                  placeholder="123 ou S/N"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Complemento
                </label>
                <input
                  value={form.complemento}
                  onChange={(e) => updateField("complemento", e.target.value)}
                  placeholder="Apto, bloco (opcional)"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-stone-700">Bairro *</label>
                <input
                  required
                  value={form.bairro}
                  onChange={(e) => updateField("bairro", e.target.value)}
                  placeholder="Ex.: Centro"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-stone-700">Cidade *</label>
                <input
                  required
                  value={form.cidade}
                  onChange={(e) => updateField("cidade", e.target.value)}
                  placeholder="Ex.: Montes Claros"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-semibold text-stone-700">UF *</label>
                <select
                  value={form.uf}
                  onChange={(e) => updateField("uf", e.target.value)}
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
                  onChange={(e) => updateField("cep", maskCep(e.target.value))}
                  placeholder="39400-000"
                  className={`${inputClass} font-mono-num`}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Criando conta..." : "Concluir cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
