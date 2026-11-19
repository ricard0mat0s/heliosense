import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getStoredToken, setStoredToken } from "../api/client";
import type { HealthInfo, Usuario, UsuarioRegisterPayload } from "../types";

interface AuthContextValue {
  user: Usuario | null;
  health: HealthInfo | null;
  openAlertsCount: number;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (payload: UsuarioRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOpenAlertsCount: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshOpenAlertsCount = useCallback(async () => {
    if (!getStoredToken()) {
      setOpenAlertsCount(0);
      return;
    }
    try {
      const open = await api.listAlertas({ resolvido: false });
      setOpenAlertsCount(open.length);
    } catch {
      // ignore transient error
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const h = await api.health();
        if (active) setHealth(h);
      } catch {
        // backend may still be starting
      }

      const token = getStoredToken();
      if (token) {
        try {
          const me = await api.getMe();
          if (active) {
            setUser(me);
            const open = await api.listAlertas({ resolvido: false });
            if (active) setOpenAlertsCount(open.length);
          }
        } catch {
          setStoredToken(null);
          if (active) setUser(null);
        }
      }

      if (active) setLoading(false);
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await api.login(email, senha);
    setStoredToken(res.access_token);
    setUser(res.usuario);
    const open = await api.listAlertas({ resolvido: false });
    setOpenAlertsCount(open.length);
  }, []);

  const register = useCallback(async (payload: UsuarioRegisterPayload) => {
    const res = await api.register(payload);
    setStoredToken(res.access_token);
    setUser(res.usuario);
    setOpenAlertsCount(0);
  }, []);

  const clearSession = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setOpenAlertsCount(0);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await api.logout();
      }
    } catch {
      // ignore if token already expired
    } finally {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        health,
        openAlertsCount,
        loading,
        login,
        register,
        logout,
        refreshUser,
        refreshOpenAlertsCount,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  }
  return ctx;
}
