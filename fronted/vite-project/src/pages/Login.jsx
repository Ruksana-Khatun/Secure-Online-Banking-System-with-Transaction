import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const from = useMemo(() => location.state?.from?.pathname || "/dashboard", [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    const password = form.get("password");

    setLoading(true);
    try {
      await login({ email, password });
      setSuccess("Signed in.");
      navigate(from, { replace: true });
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Login</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="muted">
        No account? <Link to="/register">Register</Link>
      </p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </>
  );
}

