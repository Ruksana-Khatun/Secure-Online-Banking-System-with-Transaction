import "./App.css";

import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAdmin } from "./auth/RequireAdmin";
import { RequireAuth } from "./auth/RequireAuth";
import { useAuth } from "./auth/useAuth";
import { AppShell } from "./components/AppShell";
import SimplifiedAdmin from "./pages/SimplifiedAdmin";
import AdminLogin from "./components/AdminLogin";
import BBPS from "./pages/BBPS";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import PPI from "./pages/PPI";
import Register from "./pages/Register";

// AEPS Components
import AepsRegistration from "./components/AepsRegistration";
import AepsOtpVerification from "./components/AepsOtpVerification";
import AepsKyc from "./components/AepsKyc";
import AepsWithdrawal from "./components/AepsWithdrawal";
import AepsTransactionHistory from "./components/AepsTransactionHistory";

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
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={<RequireAuth><Dashboard /></RequireAuth>}
        />
        <Route
          path="/bbps"
          element={<RequireAuth><BBPS /></RequireAuth>}
        />
        <Route
          path="/ppi"
          element={<RequireAuth><PPI /></RequireAuth>}
        />
        <Route
          path="/admin"
          element={<RequireAdmin><SimplifiedAdmin /></RequireAdmin>}
        />
      </Route>

      {/* AEPS Routes */}
      <Route path="/aeps/register"         element={<AepsRegistration />} />
      <Route path="/aeps/otp-verification" element={<AepsOtpVerification />} />
      <Route path="/aeps/kyc"              element={<AepsKyc />} />
      <Route path="/aeps/withdrawal"       element={<AepsWithdrawal />} />
      <Route path="/aeps/transactions"     element={<AepsTransactionHistory />} />

      {/* Admin Login */}
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}