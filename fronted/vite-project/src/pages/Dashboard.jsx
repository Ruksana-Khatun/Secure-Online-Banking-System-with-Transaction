import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";

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

  const [otp, setOtp] = useState({
    otpId: "",
    expiresAt: "",
    idempotencyKey: "",
    draft: null,
    code: "",
  });

  const hasAccounts = accounts.length > 0;

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

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

  const refreshAll = async () => {
    const tasks = [loadAccounts(), loadHistory()];
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
    return () => {
      active = false;
    };
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

    if (!otp.otpId || !otp.draft) {
      setError("Send OTP first.");
      return;
    }

    const otpCode = String(otp.code || "").trim();
    if (otpCode.length < 4) {
      setError("Enter the OTP code.");
      return;
    }

    setLoading(true);
    try {
      await authedRequest("/api/transactions/transfer", {
        method: "POST",
        body: {
          ...otp.draft,
          idempotencyKey: otp.idempotencyKey,
          otpId: otp.otpId,
          otpCode,
        },
      });

      setSuccess("Transfer successful.");
      setOtp({ otpId: "", expiresAt: "", idempotencyKey: "", draft: null, code: "" });
      await refreshAll();
      form.reset?.(); // resets the OTP form
      document.getElementById("transfer-form")?.reset(); // resets the main transfer form
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const cancelOtp = () => {
    setOtp({ otpId: "", expiresAt: "", idempotencyKey: "", draft: null, code: "" });
  };

  return (
    <div className="dashboard">
      <div className="tabs">
        <button className="tab active" type="button">
          Overview
        </button>
      </div>

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

      <section className="section">
        <h3>Transfer money (OTP protected)</h3>

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
                <input
                  name="toAccountNumber"
                  placeholder="Recipient account number"
                  required
                  disabled={Boolean(otp.otpId)}
                />
              </label>

              <label>
                <span>Amount</span>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  disabled={Boolean(otp.otpId)}
                />
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
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
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
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Initiated by</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allTx.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>{tx.fromAccount?.accountNumber || "-"}</td>
                    <td>{tx.toAccount?.accountNumber || "-"}</td>
                    <td>
                      {formatMoney(Number(tx.amount), tx.currency || "INR")}
                    </td>
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

