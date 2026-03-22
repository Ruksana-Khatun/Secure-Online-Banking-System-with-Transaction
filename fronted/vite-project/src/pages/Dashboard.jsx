import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";
import { Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

function formatMoney(amount, currency) {
  if (typeof amount !== "number") return `${amount ?? 0} ${currency || ""}`.trim();
  return `${amount.toFixed(2)} ${currency || ""}`.trim();
}

export default function Dashboard() {
  const { authedRequest, requestTransferOtp, role } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ AEPS agent status
  const [aepsAgent, setAepsAgent] = useState(null);  // null = loading, false = not registered
  const [aepsLoading, setAepsLoading] = useState(true);

  const [otp, setOtp] = useState({
    otpId: "", expiresAt: "", idempotencyKey: "", draft: null, code: "",
  });

  const hasAccounts = accounts.length > 0;

  const resetMessages = () => { setError(""); setSuccess(""); };

  const loadAccounts = async () => {
    const data = await authedRequest("/api/accounts");
    setAccounts(Array.isArray(data) ? data : []);
  };

  const loadHistory = async () => {
    const data = await authedRequest("/api/transactions/history");
    setHistory(Array.isArray(data) ? data : []);
  };

  const loadAllTransactionsForAdmin = async () => {
    if (role !== "ADMIN") return;
    const data = await authedRequest("/api/admin/transactions?limit=20");
    setAllTx(Array.isArray(data?.items) ? data.items : []);
  };

  // ✅ AEPS agent status load karo
  const loadAepsAgent = async () => {
    try {
      setAepsLoading(true);
      const data = await authedRequest("/api/aeps/agent/profile");
      setAepsAgent(data?.data || false);
    } catch {
      setAepsAgent(false);
    } finally {
      setAepsLoading(false);
    }
  };

  const refreshAll = async () => {
    const tasks = [loadAccounts(), loadHistory(), loadAepsAgent()];
    if (role === "ADMIN") tasks.push(loadAllTransactionsForAdmin());
    await Promise.all(tasks);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    resetMessages();
    refreshAll()
      .catch((e) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAccount = async () => {
    setLoading(true);
    resetMessages();
    try {
      await authedRequest("/api/accounts", { method: "POST" });
      setSuccess("Account created.");
      await loadAccounts();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const canSendOtp = useMemo(() => {
    if (!hasAccounts) return false;
    return !otp.otpId && !loading;
  }, [hasAccounts, otp.otpId, loading]);

  const handleSendOtpForTransfer = async (e) => {
    e.preventDefault();
    resetMessages();
    const form = new FormData(e.currentTarget);
    const fromAccountId = form.get("fromAccountId");
    const toAccountNumber = String(form.get("toAccountNumber") || "").trim();
    const amount = Number(form.get("amount"));
    if (!fromAccountId || !toAccountNumber || !Number.isFinite(amount) || amount <= 0) {
      setError("Please fill transfer details first.");
      return;
    }
    const idempotencyKey = `web-${Date.now()}`;
    setLoading(true);
    try {
      const resp = await requestTransferOtp({ idempotencyKey });
      setOtp({
        otpId: resp?.otpId || "",
        expiresAt: resp?.expiresAt || "",
        idempotencyKey,
        draft: { fromAccountId, toAccountNumber, amount },
        code: "",
      });
      setSuccess("OTP sent to your email. Enter it to confirm transfer.");
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    resetMessages();
    if (!otp.otpId || !otp.draft) { setError("Send OTP first."); return; }
    const otpCode = String(otp.code || "").trim();
    if (otpCode.length < 4) { setError("Enter the OTP code."); return; }
    setLoading(true);
    try {
      await authedRequest("/api/transactions/transfer", {
        method: "POST",
        body: { ...otp.draft, idempotencyKey: otp.idempotencyKey, otpId: otp.otpId, otpCode },
      });
      setSuccess("Transfer successful.");
      setOtp({ otpId: "", expiresAt: "", idempotencyKey: "", draft: null, code: "" });
      await refreshAll();
      form.reset?.();
      document.getElementById("transfer-form")?.reset();
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const cancelOtp = () => {
    setOtp({ otpId: "", expiresAt: "", idempotencyKey: "", draft: null, code: "" });
  };

  // ✅ AEPS status decide karo
  const aepsStatus = () => {
    if (aepsLoading) return "loading";
    if (!aepsAgent) return "not_registered";   // Register nahi kiya
    if (aepsAgent.kycStatus !== "DONE") return "kyc_pending"; // KYC baki hai
    return "approved"; // Sab theek — withdrawal allow karo
  };

  // ✅ AEPS Section — status ke hisaab se dikhao
  const renderAepsSection = () => {
    const status = aepsStatus();

    if (status === "loading") {
      return (
        <div style={aepsStyles.loadingBox}>
          <span>🔄 AEPS status check ho raha hai...</span>
        </div>
      );
    }

    if (status === "not_registered") {
      // ✅ Sirf Register button dikhao
      return (
        <div style={aepsStyles.singleCard}>
          <div style={aepsStyles.icon}>🏦</div>
          <h4 style={aepsStyles.cardTitle}>Cash withdrawal services</h4>
          <button
            className="btn primary"
            type="button"
            onClick={() => window.location.href = '/aeps/register'}
            style={aepsStyles.btn}
          >
            Register Now →
          </button>
        </div>
      );
    }

    if (status === "kyc_pending") {
      // ✅ KYC complete karo dikhao
      return (
        <div style={aepsStyles.singleCard}>
          <div style={aepsStyles.icon}>📋</div>
          <h4 style={aepsStyles.cardTitle}>complete your kyc</h4>
          <div style={aepsStyles.agentInfo}>
            <span>Outlet ID: <strong>{aepsAgent.outletId}</strong></span>
            <span>Status: <strong style={{ color: '#faad14' }}>KYC Pending</strong></span>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => window.location.href = '/aeps/otp-verification'}
            style={aepsStyles.btn}
          >
            Complete KYC →
          </button>
        </div>
      );
    }

    // status === "approved" — Withdrawal + History dikhao
    return (
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Agent Info */}
        <div className="card" style={aepsStyles.card}>
          <h4 style={aepsStyles.cardTitle}>Agent Status</h4>
          <div style={aepsStyles.agentInfo}>
            <span>Outlet: <strong>{aepsAgent.outletId}</strong></span>
            <span>KYC: <strong style={{ color: '#52c41a' }}>Complete</strong></span>
          </div>
        </div>

        {/* Cash Withdrawal */}
        <div className="card" style={aepsStyles.card}>
          <div style={aepsStyles.icon}> </div>
          <div style={aepsStyles.icon}>💰</div>
          <h4 style={aepsStyles.cardTitle}>Cash Withdrawal</h4>
          <p style={aepsStyles.cardDesc}>
            Withdraw cash from customer bank account
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={() => window.location.href = '/aeps/withdrawal'}
            style={aepsStyles.btn}
          >
            Start Withdrawal
          </button>
        </div>

        {/* Transaction History */}
        <div className="card" style={aepsStyles.card}>
          <div style={aepsStyles.icon}>📊</div>
          <h4 style={aepsStyles.cardTitle}>Transaction History</h4>
          <p style={aepsStyles.cardDesc}>
            View transactions and commission earnings
          </p>
          <button
            className="btn secondary"
            type="button"
            onClick={() => window.location.href = '/aeps/transactions'}
            style={aepsStyles.btn}
          >
            View History
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="tabs">
        <button className="tab active" type="button">Overview</button>
      </div>

      {/* Accounts */}
      <section className="section">
        <div className="section-header">
          <h3>Your accounts</h3>
          <button className="btn small" type="button" onClick={handleCreateAccount} disabled={loading}>
            + Create account
          </button>
        </div>
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏦</div>
            <p>No accounts yet.</p>
          </div>
        ) : (
          <div className="grid">
            {accounts.map((acc) => (
              <div key={acc._id} className="account-card">
                <div className="account-number">{acc.accountNumber}</div>
                <div className="account-balance">{formatMoney(acc.balance, acc.currency)}</div>
                <div className="account-meta">
                  <span>Status: {acc.status}</span>
                  <span>ID: {acc._id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transfer */}
      <section className="section">
        <h3>Transfer money</h3>
        {!hasAccounts ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <p>Create an account first to make transfers.</p>
          </div>
        ) : (
          <>
            <form id="transfer-form" className="form inline" onSubmit={handleSendOtpForTransfer}>
              <label>
                <span>From account</span>
                <select name="fromAccountId" required disabled={Boolean(otp.otpId)}>
                  <option value="">Select account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber} ({formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>To account number</span>
                <input name="toAccountNumber" placeholder="Recipient account number" required disabled={Boolean(otp.otpId)} />
              </label>
              <label>
                <span>Amount</span>
                <input name="amount" type="number" min="0.01" step="0.01" required disabled={Boolean(otp.otpId)} />
              </label>
              <button className="btn primary" type="submit" disabled={!canSendOtp}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
            {otp.otpId && (
              <form className="form inline otp-row" onSubmit={handleConfirmTransfer}>
                <label>
                  <span>OTP code</span>
                  <input
                    value={otp.code}
                    onChange={(e) => setOtp((s) => ({ ...s, code: e.target.value }))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? "Processing..." : "Confirm transfer"}
                </button>
                <button className="btn ghost" type="button" onClick={cancelOtp} disabled={loading}>
                  Cancel
                </button>
                <div className="muted otp-meta">
                  OTP expires: {otp.expiresAt ? new Date(otp.expiresAt).toLocaleTimeString() : "soon"}
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="section">
        <h3>Recent transactions</h3>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <p>No transactions yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th><th>From</th><th>To</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>{tx.fromAccount?.accountNumber || tx.fromAccount}</td>
                    <td>{tx.toAccount?.accountNumber || tx.toAccount}</td>
                    <td>{formatMoney(Number(tx.amount), tx.currency || "INR")}</td>
                    <td>{tx.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin Transactions */}
      {role === "ADMIN" && (
        <section className="section">
          <h3>All user transactions (admin)</h3>
          {allTx.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📇</div>
              <p>No transactions found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th><th>From</th><th>To</th><th>Amount</th><th>Initiated by</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allTx.map((tx) => (
                    <tr key={tx._id}>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td>{tx.fromAccount?.accountNumber || "-"}</td>
                      <td>{tx.toAccount?.accountNumber || "-"}</td>
                      <td>{formatMoney(Number(tx.amount), tx.currency || "INR")}</td>
                      <td>{tx.initiatedBy?.email || "-"}</td>
                      <td>{tx.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ✅ AEPS Section — Conditional */}
      <section className="section">
        <div className="section-header">
          <h3>Banking Services</h3>
        </div>
        {renderAepsSection()}
      </section>

      {loading && (
        <div className="loading-container">
          <div className="loader" />
          <span>Loading...</span>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// AEPS Styles
// ─────────────────────────────────────────────
const aepsStyles = {
  loadingBox: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    background: 'rgba(15, 23, 42, 0.4)',
    borderRadius: '1rem',
    border: '1px dashed rgba(148, 163, 184, 0.2)',
  },
  singleCard: {
    textAlign: 'center',
    padding: '40px 24px',
    background: 'rgba(30, 64, 175, 0.15)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    border: '1px solid rgba(129, 140, 248, 0.3)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
    maxWidth: 450,
    margin: '20px auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  card: {
    textAlign: 'center',
    padding: '32px 24px',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(16px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '220px',
    transition: 'transform 0.2s ease',
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
    filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.4))',
  },
  cardTitle: {
    marginBottom: 12,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#f8fafc',
    textTransform: 'capitalize',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 20,
    maxWidth: '220px',
  },
  agentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 20,
    background: 'rgba(15, 23, 42, 0.4)',
    padding: '12px 20px',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.1)',
    width: '100%',
  },
  btn: {
    marginTop: 'auto',
    width: '100%',
    padding: '12px 24px',
    fontWeight: 600,
  },
};