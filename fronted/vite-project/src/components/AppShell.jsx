import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function AppShell() {
  const { user, role, logout } = useAuth();

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">SB</span>
          <span className="brand-text">Secure Banking</span>
        </div>

        <div className="header-right">
          {user && (
            <>
              <nav className="nav">
                <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/dashboard">
                  Dashboard
                </NavLink>
                {role === "ADMIN" && (
                  <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/admin">
                    Admin
                  </NavLink>
                )}
              </nav>
              <span className="user-chip">
                {user.fullName} ({user.role})
              </span>
              <button className="btn ghost" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

