import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Cpu,
  Database,
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

export function Layout() {
  const { user, health, openAlertsCount, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Painel Geral", icon: LayoutDashboard, end: true },
    { to: "/casas", label: "Casas", icon: Home },
    { to: "/paineis", label: "Painéis Solares", icon: Cpu },
    { to: "/alertas", label: "Central de Alertas", icon: AlertTriangle, badge: openAlertsCount },
    { to: "/auditoria", label: "Logs de Auditoria", icon: ShieldCheck },
    { to: "/perfil", label: "Meu Perfil", icon: UserCircle },
  ];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-stone-900">HelioSense</div>
            <div className="text-[11px] font-medium text-stone-500">Energia Solar Residencial</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-3 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                      : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer status & user */}
      <div className="space-y-3 border-t border-stone-200/80 p-4">
        <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200/70">
          <span className="flex items-center gap-2 text-xs font-medium text-stone-600">
            <Database className="h-3.5 w-3.5 text-amber-600" />
            Fonte de Dados
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
              health?.data_source === "mysql"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {health?.data_source ?? "mock"}
          </span>
        </div>

        {user && (
          <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200/80">
            <p className="truncate text-sm font-bold text-stone-900">{user.nome}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-stone-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] text-stone-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-200/80 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-stone-950/35" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
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
        <header className="flex items-center justify-between border-b border-stone-200/80 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sun className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-stone-900">HelioSense</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
