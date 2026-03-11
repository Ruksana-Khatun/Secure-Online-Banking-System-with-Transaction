import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";

function clampPage(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export default function Admin() {
  const { authedRequest } = useAuth();

  const [tab, setTab] = useState("users"); // users | transactions | logs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [usersQuery, setUsersQuery] = useState({ q: "", status: "", page: 1 });
  const [users, setUsers] = useState({ items: [], total: 0, page: 1, limit: 20 });

  const [txQuery, setTxQuery] = useState({ userId: "", page: 1 });
  const [tx, setTx] = useState({ items: [], total: 0, page: 1, limit: 20 });

  const [logsQuery, setLogsQuery] = useState({ action: "", page: 1 });
  const [logs, setLogs] = useState({ items: [], total: 0, page: 1, limit: 50 });

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const loadUsers = async (q) => {
    const params = new URLSearchParams();
    if (q.q) params.set("q", q.q);
    if (q.status) params.set("status", q.status);
    params.set("page", String(clampPage(q.page)));
    params.set("limit", "20");

    const data = await authedRequest(`/api/admin/users?${params.toString()}`);
    setUsers({
      items: data?.items || [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 20,
    });
  };

  const loadTransactions = async (q) => {
    const params = new URLSearchParams();
    if (q.userId) params.set("userId", q.userId);
    params.set("page", String(clampPage(q.page)));
    params.set("limit", "20");

    const data = await authedRequest(`/api/admin/transactions?${params.toString()}`);
    setTx({
      items: data?.items || [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 20,
    });
  };

  const loadLogs = async (q) => {
    const params = new URLSearchParams();
    if (q.action) params.set("action", q.action);
    params.set("page", String(clampPage(q.page)));
    params.set("limit", "50");

    const data = await authedRequest(`/api/admin/logs?${params.toString()}`);
    setLogs({
      items: data?.items || [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 50,
    });
  };

  const activeTotal = useMemo(() => {
    if (tab === "users") return users.total;
    if (tab === "transactions") return tx.total;
    return logs.total;
  }, [tab, users.total, tx.total, logs.total]);

  const doLoad = async () => {
    setLoading(true);
    resetMessages();
    try {
      if (tab === "users") await loadUsers(usersQuery);
      else if (tab === "transactions") await loadTransactions(txQuery);
      else await loadLogs(logsQuery);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Admin load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const suspendUser = async (id) => {
    setLoading(true);
    resetMessages();
    try {
      await authedRequest(`/api/admin/users/${id}/suspend`, { method: "PUT" });
      setSuccess("User suspended.");
      await loadUsers(usersQuery);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to suspend user");
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (id) => {
    setLoading(true);
    resetMessages();
    try {
      await authedRequest(`/api/admin/users/${id}/activate`, { method: "PUT" });
      setSuccess("User activated.");
      await loadUsers(usersQuery);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to activate user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="tabs">
        <button className={`tab ${tab === "users" ? "active" : ""}`} type="button" onClick={() => setTab("users")}>
          Users
        </button>
        <button
          className={`tab ${tab === "transactions" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("transactions")}
        >
          Transactions
        </button>
        <button className={`tab ${tab === "logs" ? "active" : ""}`} type="button" onClick={() => setTab("logs")}>
          Audit logs
        </button>
      </div>

      <p className="muted">Total: {activeTotal}</p>

      {tab === "users" && (
        <section className="section">
          <h3>Users</h3>
          <form
            className="form inline"
            onSubmit={(e) => {
              e.preventDefault();
              doLoad();
            }}
          >
            <label>
              <span>Search</span>
              <input value={usersQuery.q} onChange={(e) => setUsersQuery((s) => ({ ...s, q: e.target.value }))} />
            </label>
            <label>
              <span>Status</span>
              <select value={usersQuery.status} onChange={(e) => setUsersQuery((s) => ({ ...s, status: e.target.value }))}>
                <option value="">All</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Apply"}
            </button>
          </form>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.items.map((u) => (
                <tr key={u._id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td className="actions">
                    {u.status === "ACTIVE" ? (
                      <button className="btn small ghost" type="button" disabled={loading} onClick={() => suspendUser(u._id)}>
                        Suspend
                      </button>
                    ) : (
                      <button className="btn small" type="button" disabled={loading} onClick={() => activateUser(u._id)}>
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.items.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ marginTop: 0, border: "none", background: "transparent" }}>
                      <div className="empty-state-icon">👥</div>
                      <p>No users found.</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "transactions" && (
        <section className="section">
          <h3>Transactions</h3>
          <form
            className="form inline"
            onSubmit={(e) => {
              e.preventDefault();
              doLoad();
            }}
          >
            <label>
              <span>User ID (optional)</span>
              <input value={txQuery.userId} onChange={(e) => setTxQuery((s) => ({ ...s, userId: e.target.value }))} />
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Apply"}
            </button>
          </form>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Initiated by</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tx.items.map((t) => (
                <tr key={t._id}>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.fromAccount?.accountNumber || "-"}</td>
                  <td>{t.toAccount?.accountNumber || "-"}</td>
                  <td>
                    {t.amount} {t.currency || "INR"}
                  </td>
                  <td>{t.initiatedBy?.email || "-"}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
              {tx.items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state" style={{ marginTop: 0, border: "none", background: "transparent" }}>
                      <div className="empty-state-icon">💸</div>
                      <p>No transactions found.</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "logs" && (
        <section className="section">
          <h3>Audit logs</h3>
          <form
            className="form inline"
            onSubmit={(e) => {
              e.preventDefault();
              doLoad();
            }}
          >
            <label>
              <span>Action (optional)</span>
              <input value={logsQuery.action} onChange={(e) => setLogsQuery((s) => ({ ...s, action: e.target.value }))} />
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Apply"}
            </button>
          </form>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {logs.items.map((l) => (
                <tr key={l._id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.action}</td>
                  <td>{l.actor?.email || "-"}</td>
                  <td>{l.targetUser?.email || "-"}</td>
                  <td>{l.level}</td>
                </tr>
              ))}
              {logs.items.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ marginTop: 0, border: "none", background: "transparent" }}>
                      <div className="empty-state-icon">📋</div>
                      <p>No logs found.</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}

