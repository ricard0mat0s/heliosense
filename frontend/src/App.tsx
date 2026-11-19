import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AlertsPage } from "./pages/AlertsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HousesPage } from "./pages/HousesPage";
import { LoginPage } from "./pages/LoginPage";
import { PanelDetailPage } from "./pages/PanelDetailPage";
import { PanelsPage } from "./pages/PanelsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/casas" element={<HousesPage />} />
              <Route path="/paineis" element={<PanelsPage />} />
              <Route path="/paineis/:idPainel" element={<PanelDetailPage />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/auditoria" element={<AuditLogsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
