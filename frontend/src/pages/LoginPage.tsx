import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Sun, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { extractErrorMessage } from "../utils/format";

export function LoginPage() {
  const { user, health, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-orange-900/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sun className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight">HelioSense</div>
            <div className="text-xs font-medium text-amber-100">Monitoramento Solar Residencial</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Acompanhe cada painel solar da sua casa em tempo real.
          </h1>
          <p className="text-base leading-relaxed text-amber-50/90">
            Consulte geração horária e diária, receba alertas automáticos de anomalias e mantenha a
            rastreabilidade completa de segurança em um só lugar.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl bg-white/15 p-4 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-amber-100" />
              <div className="mt-2 text-sm font-bold">Leituras Horárias</div>
              <p className="mt-1 text-xs text-amber-100/85">
                Visões horárias e diárias integradas ao banco de dados.
              </p>
            </div>
            <div className="rounded-xl bg-white/15 p-4 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 text-amber-100" />
              <div className="mt-2 text-sm font-bold">Alertas & Auditoria</div>
              <p className="mt-1 text-xs text-amber-100/85">
                Triggers de anomalia e histórico completo de ações.
              </p>
            </div>
          </div>
        </div>

        <div className="relative text-xs text-amber-100/80">
          HelioSense · Projeto Acadêmico de Banco de Dados II
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sun className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold text-stone-900">HelioSense</span>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Entrar na sua conta
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Acesse suas residências, painéis solares e relatórios de geração.
            </p>
          </div>

          {health?.data_source === "mock" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Modo Preview (Mock) Ativo
                  </div>
                  <p className="text-xs text-amber-900/85">
                    Use a conta demonstrativa pré-carregada com 2 casas, 5 painéis e 7 dias de
                    leituras:
                  </p>
                  <p className="font-mono-num text-xs text-amber-950">
                    demo@heliosense.com.br · HelioSense@2026
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                >
                  Preencher
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-stone-700">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com.br"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label htmlFor="senha" className="mb-1.5 block text-sm font-semibold text-stone-700">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
            >
              {submitting ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-sm text-stone-600">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-bold text-amber-700 hover:text-amber-800">
              Criar cadastro residencial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
