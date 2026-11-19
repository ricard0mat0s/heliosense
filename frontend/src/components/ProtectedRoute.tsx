import { Navigate, Outlet } from "react-router-dom";
import { Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF8F5] text-stone-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Sun className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-medium">Carregando HelioSense...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
