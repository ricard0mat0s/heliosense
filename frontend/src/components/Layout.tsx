import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Cpu,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../utils/format";

export function Layout() {
  const { user, health, openAlertsCount, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Painel Geral", icon: LayoutDashboard, end: true },
    { to: "/casas", label: "Residências", icon: Home },
    { to: "/paineis", label: "Painéis Solares", icon: Cpu },
    { to: "/alertas", label: "Central de Alertas", icon: AlertTriangle, badge: openAlertsCount },
    { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
    { to: "/perfil", label: "Meu Perfil", icon: UserCircle },
  ];

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white shadow-xs">
            <Sun className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold tracking-tight text-stone-900">HelioSense</div>
            <div className="text-xs font-medium text-stone-500">Energia Solar Residencial</div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Navegação principal" className="mt-2 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-10 items-center justify-between rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-amber-50 text-amber-950 ring-1 ring-amber-200/90"
                      : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-amber-700" : "text-stone-500"}`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="font-mono-num rounded-full bg-rose-700 px-2 py-0.5 text-[11px] font-bold text-white"
                        aria-label={`${item.badge} alertas em aberto`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer status & user */}
      <div className="border-t border-stone-200/80 p-4">
        {health?.data_source === "mock" && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
            Ambiente de demonstração
          </div>
        )}

        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-700 ring-1 ring-stone-200"
                aria-hidden="true"
              >
                {getInitials(user.nome)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900">{user.nome}</p>
                <p className="truncate text-xs text-stone-500">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hs-btn-secondary w-full py-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] text-stone-900">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-amber-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md"
      >
        Pular para o conteúdo principal
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-200/80 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div
            className="fixed inset-0 bg-stone-950/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="hs-icon-btn absolute right-3 top-4"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-xs lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-700 text-white">
              <Sun className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-extrabold tracking-tight text-stone-900">HelioSense</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="hs-icon-btn"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main
          id="conteudo-principal"
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
