import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Sun, UserPlus } from "lucide-react";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { useAuth } from "../context/AuthContext";
import {
  extractErrorMessage,
  maskCep,
  maskCpf,
  maskPhone,
  UFS_BRASIL,
} from "../utils/format";

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
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white shadow-xs">
              <Sun className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
                Cadastro Residencial
              </h1>
              <p className="text-sm text-stone-600">Crie sua conta no HelioSense</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-stone-600 transition hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao login
          </Link>
        </div>

        {error && (
          <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
            {error}
          </FeedbackBanner>
        )}

        <form onSubmit={handleSubmit} className="hs-card space-y-7 p-6 sm:p-8">
          {/* Dados Pessoais */}
          <fieldset className="space-y-4">
            <legend className="text-base font-bold tracking-tight text-stone-900">
              Dados pessoais e acesso
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="reg-nome" className="hs-label">
                  Nome completo *
                </label>
                <input
                  id="reg-nome"
                  required
                  autoComplete="name"
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Ex.: Ana Paula Ferreira"
                  className="hs-input"
                />
              </div>

              <div>
                <label htmlFor="reg-cpf" className="hs-label">
                  CPF *
                </label>
                <input
                  id="reg-cpf"
                  required
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(e) => updateField("cpf", maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="hs-input font-mono-num"
                />
              </div>

              <div>
                <label htmlFor="reg-nasc" className="hs-label">
                  Data de nascimento *
                </label>
                <input
                  id="reg-nasc"
                  type="date"
                  required
                  autoComplete="bday"
                  value={form.data_nascimento}
                  onChange={(e) => updateField("data_nascimento", e.target.value)}
                  className="hs-input"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="hs-label">
                  E-mail *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="voce@exemplo.com.br"
                  className="hs-input"
                />
              </div>

              <div>
                <label htmlFor="reg-telefone" className="hs-label">
                  Telefone *
                </label>
                <input
                  id="reg-telefone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", maskPhone(e.target.value))}
                  placeholder="(38) 99999-0000"
                  className="hs-input font-mono-num"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="reg-senha" className="hs-label">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    id="reg-senha"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={form.senha}
                    onChange={(e) => updateField("senha", e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="hs-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Endereço de Contato */}
          <fieldset className="space-y-4 border-t border-stone-100 pt-6">
            <legend className="text-base font-bold tracking-tight text-stone-900">
              Endereço de contato
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="reg-logradouro" className="hs-label">
                  Logradouro *
                </label>
                <input
                  id="reg-logradouro"
                  required
                  autoComplete="street-address"
                  value={form.logradouro}
                  onChange={(e) => updateField("logradouro", e.target.value)}
                  placeholder="Rua, Avenida..."
                  className="hs-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="reg-numero" className="hs-label">
                  Número *
                </label>
                <input
                  id="reg-numero"
                  required
                  value={form.numero}
                  onChange={(e) => updateField("numero", e.target.value)}
                  placeholder="123 ou S/N"
                  className="hs-input"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="reg-complemento" className="hs-label">
                  Complemento
                </label>
                <input
                  id="reg-complemento"
                  value={form.complemento}
                  onChange={(e) => updateField("complemento", e.target.value)}
                  placeholder="Apto, bloco (opcional)"
                  className="hs-input"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="reg-bairro" className="hs-label">
                  Bairro *
                </label>
                <input
                  id="reg-bairro"
                  required
                  value={form.bairro}
                  onChange={(e) => updateField("bairro", e.target.value)}
                  placeholder="Ex.: Centro"
                  className="hs-input"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="reg-cidade" className="hs-label">
                  Cidade *
                </label>
                <input
                  id="reg-cidade"
                  required
                  autoComplete="address-level2"
                  value={form.cidade}
                  onChange={(e) => updateField("cidade", e.target.value)}
                  placeholder="Ex.: Montes Claros"
                  className="hs-input"
                />
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="reg-uf" className="hs-label">
                  UF *
                </label>
                <select
                  id="reg-uf"
                  value={form.uf}
                  onChange={(e) => updateField("uf", e.target.value)}
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
                <label htmlFor="reg-cep" className="hs-label">
                  CEP *
                </label>
                <input
                  id="reg-cep"
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={form.cep}
                  onChange={(e) => updateField("cep", maskCep(e.target.value))}
                  placeholder="39400-000"
                  className="hs-input font-mono-num"
                />
              </div>
            </div>
          </fieldset>

          <button type="submit" disabled={submitting} className="hs-btn-primary w-full py-3">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? "Criando conta..." : "Concluir cadastro"}
          </button>
        </form>
      </div>
    </div>
  );
}
