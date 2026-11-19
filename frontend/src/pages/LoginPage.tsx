import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sun, Zap } from "lucide-react";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../utils/format";

export function LoginPage() {
  const { user, health, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), senha);
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoCredentials() {
    setEmail("demo@heliosense.com.br");
    setSenha("HelioSense@2026");
    setError(null);
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      {/* Left solar editorial panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-900 via-amber-950 to-stone-950 p-12 text-white lg:flex">
        <div className="hs-solar-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
            <Sun className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-white">HelioSense</div>
            <div className="text-xs font-medium text-amber-200">Energia Solar Residencial</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white">
            Acompanhe cada painel solar da sua casa com clareza.
          </h1>
          <p className="text-base leading-relaxed text-stone-200">
            Visualize a geração horária e diária por residência, identifique quedas inesperadas de
            produção e mantenha o histórico completo dos seus equipamentos em um só lugar.
          </p>

          <dl className="grid grid-cols-1 gap-4 border-t border-white/15 pt-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <dt className="flex items-center gap-2 text-sm font-bold text-amber-200">
                <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
                Geração por painel
              </dt>
              <dd className="text-xs leading-relaxed text-stone-300">
                Curvas horárias, acumulados diários e acompanhamento individual de cada módulo.
              </dd>
            </div>
            <div className="space-y-1.5">
              <dt className="flex items-center gap-2 text-sm font-bold text-amber-200">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                Alertas automáticos
              </dt>
              <dd className="text-xs leading-relaxed text-stone-300">
                Avisos imediatos para geração zero durante o dia ou leituras acima da capacidade.
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative text-xs text-stone-300">
          HelioSense · Gestão Residencial de Energia Solar
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-white">
              <Sun className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-stone-900">HelioSense</span>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Entrar na sua conta
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Acesse suas residências, painéis solares e relatórios de geração.
            </p>
          </div>

          {health?.data_source === "mock" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-amber-950">Conta demonstrativa disponível</p>
                  <p className="text-xs leading-relaxed text-amber-900">
                    2 residências, 5 painéis e 7 dias de leituras pré-carregados.
                  </p>
                  <p className="font-mono-num truncate text-xs text-amber-950">
                    demo@heliosense.com.br · HelioSense@2026
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="hs-btn-primary shrink-0 px-3 py-2 text-xs"
                >
                  Preencher
                </button>
              </div>
            </div>
          )}

          {error && (
            <FeedbackBanner tone="error" onDismiss={() => setError(null)}>
              {error}
            </FeedbackBanner>
          )}

          <form onSubmit={handleSubmit} className="hs-card space-y-4 p-6">
            <div>
              <label htmlFor="login-email" className="hs-label">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com.br"
                className="hs-input"
              />
            </div>

            <div>
              <label htmlFor="login-senha" className="hs-label">
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-senha"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
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

            <button type="submit" disabled={submitting} className="hs-btn-primary w-full py-2.5">
              {submitting ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <p className="text-center text-sm text-stone-600">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-semibold text-amber-800 hover:underline">
              Criar cadastro residencial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
