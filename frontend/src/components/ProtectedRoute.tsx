import { Navigate, Outlet } from "react-router-dom";
import { Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF8F5] text-stone-600"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-700 text-white shadow-xs">
          <Sun className="h-5 w-5 animate-pulse" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-stone-600">Carregando HelioSense...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
