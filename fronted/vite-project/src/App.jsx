import "./App.css";

import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin } from "./auth/RequireAdmin";
import { RequireAuth } from "./auth/RequireAuth";
import { useAuth } from "./auth/useAuth";
import { AppShell } from "./components/AppShell";
import Admin from "./pages/Admin";
import BBPS from "./pages/BBPS";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PPI from "./pages/PPI";
import Register from "./pages/Register";

function HomeRedirect() {
  const { hydrated, isAuthenticated } = useAuth();
  if (!hydrated) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<AppShell />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/bbps"
          element={
            <RequireAuth>
              <BBPS />
            </RequireAuth>
          }
        />
        <Route
          path="/ppi"
          element={
            <RequireAuth>
              <PPI />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
