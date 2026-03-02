import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const fullName = form.get("fullName");
    const email = form.get("email");
    const password = form.get("password");

    setLoading(true);
    try {
      await register({ fullName, email, password });
      setSuccess("Registered successfully. Please log in.");
      navigate("/login", { replace: true });
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Create account</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          <span>Full name</span>
          <input name="fullName" required autoComplete="name" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" required minLength={6} autoComplete="new-password" />
        </label>
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </>
  );
}

