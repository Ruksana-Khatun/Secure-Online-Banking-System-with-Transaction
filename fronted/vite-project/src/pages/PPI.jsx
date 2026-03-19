import { useCallback, useMemo, useState } from "react";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";


export default function PPI() {
  const { authedRequest } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("SENDER"); // SENDER | RECIPIENTS | TXN

  const [customerId, setCustomerId] = useState("");
  const [sender, setSender] = useState(null);

  const [senderForm, setSenderForm] = useState({ name: "", mobile: "" });
  const [otpCode, setOtpCode] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");

  const [recipients, setRecipients] = useState([]);
  const [recipientDraft, setRecipientDraft] = useState({ name: "", mobile: "" });
  const [bankDraft, setBankDraft] = useState({ recipientId: "", accountNumber: "", ifsc: "" });
  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  const [txnAmount, setTxnAmount] = useState("");
  const [txnOtpRef, setTxnOtpRef] = useState(null);
  const [txnResult, setTxnResult] = useState(null);
  const [inquiryResult, setInquiryResult] = useState(null);

  const resetMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const normalizedCustomerId = useMemo(() => String(customerId || "").trim(), [customerId]);

  const loadSenderInfo = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/sender/${encodeURIComponent(id)}`);
      if (!res?.success) throw new Error(res?.message || "Failed to load sender");
      setSender(res.data);
      setSuccess("Sender info loaded.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load sender");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, resetMessages]);

  const onboardSender = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id && !String(senderForm.mobile || "").trim()) {
      setError("Enter customerId or mobile.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/sender/onboard`, {
        method: "POST",
        body: {
          customerId: id,
          name: senderForm.name,
          mobile: senderForm.mobile,
        },
      });
      if (!res?.success) throw new Error(res?.message || "Sender onboard failed");
      setSender(res.data);
      setSuccess("Sender onboarded.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sender onboard failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, resetMessages, senderForm]);

  const verifySenderOtp = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const otp = String(otpCode || "").trim();
    if (!otp) {
      setError("Enter OTP code (mock: 123456).");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/sender/verify-otp`, {
        method: "POST",
        body: { customerId: id, otp },
      });
      if (!res?.success) throw new Error(res?.message || "OTP verify failed");
      setSender(res.data);
      setSuccess("OTP verified.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "OTP verify failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, otpCode, resetMessages]);

  const validateAadhaar = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const a = String(aadhaar || "").trim();
    if (!a) {
      setError("Enter Aadhaar.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/sender/${encodeURIComponent(id)}/aadhaar`, {
        method: "POST",
        body: { aadhaar: a },
      });
      if (!res?.success) throw new Error(res?.message || "Aadhaar validation failed");
      setSender(res.data);
      setSuccess("Aadhaar validated.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aadhaar validation failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, aadhaar, resetMessages]);

  const validatePan = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const p = String(pan || "").trim();
    if (!p) {
      setError("Enter PAN.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/sender/${encodeURIComponent(id)}/pan`, {
        method: "POST",
        body: { pan: p },
      });
      if (!res?.success) throw new Error(res?.message || "PAN validation failed");
      setSender(res.data);
      setSuccess("PAN validated.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "PAN validation failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, pan, resetMessages]);

  const loadRecipients = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/recipients/${encodeURIComponent(id)}`);
      if (!res?.success) throw new Error(res?.message || "Failed to load recipients");
      const list = res.data?.recipients ?? res.data?.items ?? res.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      setRecipients(arr);
      setSuccess("Recipients loaded.");
      if (!selectedRecipientId && arr[0]?.recipient_id) setSelectedRecipientId(String(arr[0].recipient_id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load recipients");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, resetMessages, selectedRecipientId]);

  const addNewRecipient = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const name = String(recipientDraft.name || "").trim();
    const mobile = String(recipientDraft.mobile || "").trim();
    if (!name || !mobile) {
      setError("Enter recipient name and mobile.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/recipients/${encodeURIComponent(id)}`, {
        method: "POST",
        body: { name, mobile },
      });
      if (!res?.success) throw new Error(res?.message || "Add recipient failed");
      setSuccess("Recipient added.");
      await loadRecipients();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Add recipient failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, recipientDraft, resetMessages, loadRecipients]);

  const addRecipientBank = useCallback(async () => {
    resetMessages();
    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const recipientId = String(bankDraft.recipientId || selectedRecipientId || "").trim();
    if (!recipientId) {
      setError("Select recipientId first.");
      return;
    }
    const accountNumber = String(bankDraft.accountNumber || "").trim();
    const ifsc = String(bankDraft.ifsc || "").trim();
    if (!accountNumber || !ifsc) {
      setError("Enter account number and IFSC.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/recipients/${encodeURIComponent(id)}/bank`, {
        method: "POST",
        body: { recipientId, accountNumber, ifsc },
      });
      if (!res?.success) throw new Error(res?.message || "Add recipient bank failed");
      setSuccess("Recipient bank added.");
      await loadRecipients();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Add recipient bank failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, bankDraft, selectedRecipientId, resetMessages, loadRecipients]);

  const sendTxnOtp = useCallback(async () => {
    resetMessages();
    setTxnOtpRef(null);
    setTxnResult(null);
    setInquiryResult(null);

    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const amt = Number(txnAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/transactions/${encodeURIComponent(id)}/send-otp`, {
        method: "POST",
        body: { amount: amt },
      });
      if (!res?.success) throw new Error(res?.message || "Send txn OTP failed");
      setTxnOtpRef(res.data);
      setSuccess("Transaction OTP sent (mock OTP: 123456).");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Send txn OTP failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, resetMessages, txnAmount]);

  const initiateTxn = useCallback(async () => {
    resetMessages();
    setTxnResult(null);
    setInquiryResult(null);

    const id = normalizedCustomerId;
    if (!id) {
      setError("Enter customerId first.");
      return;
    }
    const recipientId = String(selectedRecipientId || "").trim();
    if (!recipientId) {
      setError("Select a recipient first.");
      return;
    }
    const amt = Number(txnAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    const otp = String(otpCode || "").trim();
    if (!otp) {
      setError("Enter OTP code (mock: 123456).");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/transactions/${encodeURIComponent(id)}/initiate`, {
        method: "POST",
        body: { recipientId, amount: amt, otp },
      });
      if (!res?.success) throw new Error(res?.message || "Transaction initiate failed");
      setTxnResult(res.data);
      setSuccess("Transaction initiated successfully! Refreshing sender info...");

      // ✅ Reset form fields after successful transaction
      setTxnAmount("");
      setOtpCode("");
      setTxnOtpRef(null);

      // ✅ Reload sender info to reflect updated balance/limits
      try {
        const senderRes = await authedRequest(`/api/ppi/sender/${encodeURIComponent(id)}`);
        if (senderRes?.success) setSender(senderRes.data);
      } catch {
        // silently ignore refresh failure, transaction still succeeded
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Transaction initiate failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, normalizedCustomerId, resetMessages, selectedRecipientId, txnAmount, otpCode]);

  const inquiryTxn = useCallback(async () => {
    resetMessages();
    const clientRefId = txnResult?.transaction?.meta?.clientRefId;
    if (!clientRefId) {
      setError("No clientRefId found. Initiate a transaction first.");
      return;
    }
    setLoading(true);
    try {
      const res = await authedRequest(`/api/ppi/transactions/inquiry/${encodeURIComponent(clientRefId)}`);
      if (!res?.success) throw new Error(res?.message || "Inquiry failed");
      setInquiryResult(res.data);
      setSuccess("Inquiry loaded.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Inquiry failed");
    } finally {
      setLoading(false);
    }
  }, [authedRequest, resetMessages, txnResult]);

  return (
    <div className="dashboard">
      <div className="tabs">
        <button className={`tab ${activeTab === "SENDER" ? "active" : ""}`} type="button" onClick={() => setActiveTab("SENDER")}>
          Sender
        </button>
        <button
          className={`tab ${activeTab === "RECIPIENTS" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("RECIPIENTS")}
        >
          Recipients
        </button>
        <button className={`tab ${activeTab === "TXN" ? "active" : ""}`} type="button" onClick={() => setActiveTab("TXN")}>
          Transaction
        </button>
      </div>

      <section className="section">
        <h3>PPI – DigiKhata</h3>
        {/* <p className="muted">
          This page calls your backend PPI APIs. If `USE_PPI_MOCK=true`, OTP is `123456` and no external API is called.
        </p> */}

        <div className="form inline" style={{ marginTop: "0.75rem" }}>
          <label>
            <span>Sender Mobile Number <span className="muted" style={{ fontSize: "0.78rem" }}>(Customer ID)</span></span>
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="10-digit mobile e.g. 9962981729"
              inputMode="numeric"
              maxLength={10}
              disabled={loading}
            />
          </label>
          <button className="btn" type="button" onClick={loadSenderInfo} disabled={loading}>
            Load sender info
          </button>
          <button className="btn" type="button" onClick={loadRecipients} disabled={loading}>
            Load recipients
          </button>
        </div>
      </section>

      {activeTab === "SENDER" && (
        <>
          <section className="section">
            <h3>Onboard sender</h3>
            <form
              className="form inline"
              onSubmit={(e) => {
                e.preventDefault();
                onboardSender();
              }}
            >
              <label>
                <span>Name</span>
                <input
                  value={senderForm.name}
                  onChange={(e) => setSenderForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Sender name"
                  disabled={loading}
                />
              </label>
              <label>
                <span>Mobile</span>
                <input
                  value={senderForm.mobile}
                  onChange={(e) => setSenderForm((s) => ({ ...s, mobile: e.target.value }))}
                  placeholder="10-digit mobile"
                  disabled={loading}
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? "Working..." : "Onboard"}
              </button>
            </form>
          </section>

          <section className="section">
            <h3>Verify sender OTP</h3>
            <form
              className="form inline"
              onSubmit={(e) => {
                e.preventDefault();
                verifySenderOtp();
              }}
            >
              <label>
                <span>OTP</span>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  disabled={loading}
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                Verify OTP
              </button>
            </form>
          </section>

          <section className="section">
            <h3>KYC</h3>
            <div className="form inline">
              <label>
                <span>Aadhaar</span>
                <input
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="Aadhaar number"
                  disabled={loading}
                />
              </label>
              <button className="btn" type="button" onClick={validateAadhaar} disabled={loading}>
                Validate Aadhaar
              </button>

              <label>
                <span>PAN</span>
                <input value={pan} onChange={(e) => setPan(e.target.value)} placeholder="PAN number" disabled={loading} />
              </label>
              <button className="btn" type="button" onClick={validatePan} disabled={loading}>
                Validate PAN
              </button>
            </div>
          </section>

          {sender && (
            <section className="section">
              <h3>Sender Profile</h3>
              <div className="info-card">
                <div className="info-row"><span className="info-label">Customer ID</span><span className="info-value">{sender.customer_id ?? "—"}</span></div>
                {sender.name && <div className="info-row"><span className="info-label">Name</span><span className="info-value">{sender.name}</span></div>}
                <div className="info-row"><span className="info-label">Mobile</span><span className="info-value">{sender.mobile ?? "—"}</span></div>
                <div className="info-row"><span className="info-label">KYC Level</span><span className="info-value">{sender.kyc_level ?? "—"}</span></div>
                <div className="info-row"><span className="info-label">Monthly Limit</span><span className="info-value">₹{sender.monthly_limit ?? "—"}</span></div>
                <div className="info-row"><span className="info-label">Remaining Limit</span><span className="info-value">₹{sender.remaining_limit ?? "—"}</span></div>
                {sender.message && <div className="info-row"><span className="info-label">Status</span><span className="info-value muted">{sender.message}</span></div>}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === "RECIPIENTS" && (
        <>
          <section className="section">
            <h3>Recipients list</h3>
            {recipients.length === 0 ? (
              <div className="muted">No recipients loaded. Click "Load recipients".</div>
            ) : (
              <div className="form inline">
                <label>
                  <span>Select recipient</span>
                  <select value={selectedRecipientId} onChange={(e) => setSelectedRecipientId(e.target.value)} disabled={loading}>
                    <option value="">Select recipient</option>
                    {recipients.map((r) => (
                      <option key={r.recipient_id} value={r.recipient_id}>
                        {r.name} ({r.mobile}) — {r.recipient_id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className="section">
            <h3>Add recipient</h3>
            <form
              className="form inline"
              onSubmit={(e) => {
                e.preventDefault();
                addNewRecipient();
              }}
            >
              <label>
                <span>Name</span>
                <input
                  value={recipientDraft.name}
                  onChange={(e) => setRecipientDraft((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Recipient name"
                  disabled={loading}
                />
              </label>
              <label>
                <span>Mobile</span>
                <input
                  value={recipientDraft.mobile}
                  onChange={(e) => setRecipientDraft((s) => ({ ...s, mobile: e.target.value }))}
                  placeholder="10-digit mobile"
                  disabled={loading}
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                Add
              </button>
            </form>
          </section>

          <section className="section">
            <h3>Add recipient bank</h3>
            <form
              className="form inline"
              onSubmit={(e) => {
                e.preventDefault();
                addRecipientBank();
              }}
            >
              <label>
                <span>Recipient ID</span>
                <input
                  value={bankDraft.recipientId}
                  onChange={(e) => setBankDraft((s) => ({ ...s, recipientId: e.target.value }))}
                  placeholder={selectedRecipientId || "recipient_id"}
                  disabled={loading}
                />
              </label>
              <label>
                <span>Account number</span>
                <input
                  value={bankDraft.accountNumber}
                  onChange={(e) => setBankDraft((s) => ({ ...s, accountNumber: e.target.value }))}
                  placeholder="Account number"
                  disabled={loading}
                />
              </label>
              <label>
                <span>IFSC</span>
                <input
                  value={bankDraft.ifsc}
                  onChange={(e) => setBankDraft((s) => ({ ...s, ifsc: e.target.value }))}
                  placeholder="IFSC"
                  disabled={loading}
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                Add bank
              </button>
            </form>
          </section>

          {recipients.length > 0 && (
            <section className="section">
              <h3>Loaded Recipients</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recipients.map((r) => (
                  <div key={r.recipient_id} className="info-card">
                    <div className="info-row"><span className="info-label">Name</span><span className="info-value">{r.name}</span></div>
                    <div className="info-row"><span className="info-label">Mobile</span><span className="info-value">{r.mobile}</span></div>
                    <div className="info-row"><span className="info-label">Recipient ID</span><span className="info-value muted" style={{ fontSize: "0.78rem" }}>{r.recipient_id}</span></div>
                    {r.bank && (
                      <>
                        <div className="info-row"><span className="info-label">Account</span><span className="info-value">{r.bank.accountNumber}</span></div>
                        <div className="info-row"><span className="info-label">IFSC</span><span className="info-value">{r.bank.ifsc}</span></div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === "TXN" && (
        <>
          <section className="section">
            <h3>Send transaction OTP</h3>
            <form
              className="form inline"
              onSubmit={(e) => {
                e.preventDefault();
                sendTxnOtp();
              }}
            >
              <label>
                <span>Amount (₹)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                  placeholder="Amount"
                  disabled={loading}
                />
              </label>
              <button className="btn primary" type="submit" disabled={loading}>
                Send OTP
              </button>
            </form>
            {txnOtpRef && (
              <div className="info-card" style={{ marginTop: "0.75rem" }}>
                <div className="info-row"><span className="info-label">OTP Ref ID</span><span className="info-value" style={{ fontSize: "0.8rem" }}>{txnOtpRef.otp_ref_id ?? txnOtpRef.otpRefId ?? "—"}</span></div>
                <div className="info-row"><span className="info-label">Amount</span><span className="info-value">₹{txnOtpRef.amount ?? "—"}</span></div>
                <div className="info-row"><span className="info-label">Message</span><span className="info-value muted">{txnOtpRef.message ?? "OTP sent"}</span></div>
              </div>
            )}
          </section>

          <section className="section">
            <h3>Initiate transaction</h3>
            <div className="form inline">
              <label>
                <span>Recipient</span>
                <select value={selectedRecipientId} onChange={(e) => setSelectedRecipientId(e.target.value)} disabled={loading}>
                  <option value="">Select recipient</option>
                  {recipients.map((r) => (
                    <option key={r.recipient_id} value={r.recipient_id}>
                      {r.name} ({r.mobile})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>OTP</span>
                <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Mock: 123456" disabled={loading} />
              </label>
              <button className="btn primary" type="button" onClick={initiateTxn} disabled={loading}>
                Initiate
              </button>
              <button className="btn" type="button" onClick={inquiryTxn} disabled={loading}>
                Inquiry
              </button>
            </div>
          </section>

          {txnResult && (
            <section className="section">
              <h3>Transaction Result</h3>
              <div className="info-card">
                {(() => {
                  const tx = txnResult?.transaction ?? txnResult;
                  const prov = txnResult?.provider ?? {};
                  const status = tx?.status ?? prov?.txstatus_desc ?? "—";
                  const statusColor = status === "SUCCESS" ? "#22c55e" : status === "FAILED" ? "#ef4444" : "#facc15";
                  return (
                    <>
                      <div className="info-row">
                        <span className="info-label">Status</span>
                        <span className="info-value" style={{ color: statusColor, fontWeight: 700 }}>{status}</span>
                      </div>
                      <div className="info-row"><span className="info-label">Ref ID</span><span className="info-value" style={{ fontSize: "0.8rem" }}>{tx?.idempotencyKey ?? tx?.meta?.clientRefId ?? prov?.client_ref_id ?? "—"}</span></div>
                      <div className="info-row"><span className="info-label">Amount</span><span className="info-value">₹{tx?.amount ?? "—"}</span></div>
                      {tx?.createdAt && <div className="info-row"><span className="info-label">Time</span><span className="info-value">{new Date(tx.createdAt).toLocaleString()}</span></div>}
                      {prov?.message && <div className="info-row"><span className="info-label">Message</span><span className="info-value muted">{prov.message}</span></div>}
                    </>
                  );
                })()}
              </div>
            </section>
          )}

          {inquiryResult && (
            <section className="section">
              <h3>Inquiry Result</h3>
              <div className="info-card">
                {(() => {
                  const status = inquiryResult?.txstatus_desc ?? (inquiryResult?.tx_status === 0 ? "SUCCESS" : "PENDING");
                  const statusColor = status === "SUCCESS" || status === "Success" ? "#22c55e" : status === "FAILED" ? "#ef4444" : "#facc15";
                  return (
                    <>
                      <div className="info-row">
                        <span className="info-label">Status</span>
                        <span className="info-value" style={{ color: statusColor, fontWeight: 700 }}>{status}</span>
                      </div>
                      <div className="info-row"><span className="info-label">Client Ref ID</span><span className="info-value" style={{ fontSize: "0.8rem" }}>{inquiryResult?.client_ref_id ?? "—"}</span></div>
                      {inquiryResult?.message && <div className="info-row"><span className="info-label">Message</span><span className="info-value muted">{inquiryResult.message}</span></div>}
                    </>
                  );
                })()}
              </div>
            </section>
          )}
        </>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loader" />
          <span>Working...</span>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}

