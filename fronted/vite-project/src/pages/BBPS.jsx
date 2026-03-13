import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/request";
import { useAuth } from "../auth/useAuth";

const DEFAULT_LATLONG = "25.309580,83.005692";

// Fallback when Eko API is unavailable (wrong credentials / 500)
const FALLBACK_CATEGORIES = [
  { operator_category_id: 2, operator_category_name: "Gas" },
  { operator_category_id: 4, operator_category_name: "DTH" },
  { operator_category_id: 5, operator_category_name: "Mobile Prepaid" },
  { operator_category_id: 8, operator_category_name: "Electricity" },
  { operator_category_id: 11, operator_category_name: "Water" },
  { operator_category_id: 18, operator_category_name: "LPG Cylinder" },
];

const FALLBACK_OPERATORS_BY_CATEGORY = {
  2: [{ operator_id: 28, name: "Mahanagar Gas" }, { operator_id: 51, name: "Adani Gas" }],
  4: [{ operator_id: 1, name: "Airtel DTH" }, { operator_id: 2, name: "Tata Sky" }],
  5: [{ operator_id: 1, name: "Airtel" }, { operator_id: 2, name: "Jio" }, { operator_id: 3, name: "Vi" }],
  8: [{ operator_id: 22, name: "BSES Rajdhani" }, { operator_id: 23, name: "Tata Power" }],
  11: [{ operator_id: 1, name: "Delhi Jal Board" }],
  18: [{ operator_id: 1, name: "Indian Oil" }, { operator_id: 2, name: "Bharat Gas" }],
};

export default function BBPS() {
  const { authedRequest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("BBPS"); // "BBPS" | "PPI"

  const [categories, setCategories] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedOperator, setSelectedOperator] = useState(null);

  const [billResult, setBillResult] = useState(null);
  const [payResult, setPayResult] = useState(null);

  const [ppiResult, setPpiResult] = useState(null);

  const [form, setForm] = useState({
    utilityAccNo: "",
    customerMobile: "",
    senderName: "",
    amount: "",
    latlong: DEFAULT_LATLONG,
  });

  const sanitizePreview = useCallback((value) => {
    const dropEmpty = (v) => {
      if (v === null || v === undefined) return undefined;
      if (typeof v === "string") {
        const s = v.trim();
        return s.length ? s : undefined;
      }
      if (Array.isArray(v)) {
        const arr = v.map(dropEmpty).filter((x) => x !== undefined);
        return arr.length ? arr : undefined;
      }
      if (typeof v === "object") {
        const out = {};
        for (const [k, val] of Object.entries(v)) {
          const cleaned = dropEmpty(val);
          if (cleaned !== undefined) out[k] = cleaned;
        }
        return Object.keys(out).length ? out : undefined;
      }
      return v;
    };

    return dropEmpty(value);
  }, []);

  const resetMessages = useCallback(() => {
    setError("");
    setFieldErrors({});
    setSuccess("");
    setPpiResult(null);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await authedRequest("/api/bbps/categories");
      if (!res?.success) throw new Error(res?.message || "Failed to load categories");
      const list = res.data?.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      if (arr.length > 0) {
        setCategories(arr);
        return;
      }
    } catch {
      /* use fallback */
    }
    // Eko API failed or returned empty - use fallback so UI works for demo
    setCategories(FALLBACK_CATEGORIES);
    setError("Using demo categories. Connect correct Eko credentials for live data.");
  }, [authedRequest]);

  const loadOperators = useCallback(
    async (categoryId) => {
      if (!categoryId) {
        setOperators([]);
        return;
      }
      try {
        const res = await authedRequest(`/api/bbps/operators/${categoryId}`);
        if (!res?.success) throw new Error(res?.message || "Failed to load operators");
        const list = res.data?.data ?? [];
        const arr = Array.isArray(list) ? list : [];
        if (arr.length > 0) {
          setOperators(arr);
          return;
        }
      } catch {
        /* use fallback */
      }
      const fallback = FALLBACK_OPERATORS_BY_CATEGORY[Number(categoryId)] ?? [];
      setOperators(fallback);
      if (fallback.length === 0) setError("No operators for this category. Connect correct Eko credentials for live data.");
    },
    [authedRequest]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    resetMessages();
    loadCategories()
      .catch((e) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : "Failed to load categories");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadCategories, resetMessages]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setOperators([]);
      setSelectedOperator(null);
      return;
    }
    setLoading(true);
    loadOperators(selectedCategoryId)
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Failed to load operators");
        setOperators([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCategoryId, loadOperators]);

  const handlePpiSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const senderMobile = String(form.customerMobile || "").trim();
      const recipientAccount = String(form.utilityAccNo || "").trim();
      const amount = Number(form.amount);

      if (!senderMobile || !recipientAccount) {
        setError("Enter sender mobile and recipient account.");
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid amount.");
        return;
      }

      const res = await authedRequest("/api/ppi/transactions", {
        method: "POST",
        body: {
          senderMobile,
          recipientAccount,
          amount,
          description: form.senderName || undefined,
        },
      });

      if (!res?.success) {
        throw new ApiError(res?.message || "PPI transaction failed", res);
      }

      setPpiResult(res.data);
      setSuccess("PPI transaction initiated.");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("PPI transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBill = async (e) => {
    e.preventDefault();
    resetMessages();
    setBillResult(null);

    const billerId = selectedOperator?.operator_id;
    if (!billerId) {
      setError("Select a category and operator first.");
      return;
    }
    const utilityAccNo = String(form.utilityAccNo || "").trim();
    const customerMobile = String(form.customerMobile || "").trim();
    if (!utilityAccNo || !customerMobile) {
      setError("Enter utility account number and customer mobile.");
      return;
    }

    setLoading(true);
    try {
      const res = await authedRequest("/api/bbps/fetch-bill", {
        method: "POST",
        body: {
          billerId,
          utilityAccNo,
          customerMobile,
          senderName: form.senderName || undefined,
          amount: form.amount || undefined,
          latlong: form.latlong || DEFAULT_LATLONG,
        },
      });
      if (!res?.success) throw new Error(res?.message || "Fetch bill failed");
      setBillResult(res.data);
      setSuccess("Bill fetched. You can pay the amount below.");
      if (res.data?.data?.amount) setForm((f) => ({ ...f, amount: String(res.data.data.amount) }));
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        if (e.data?.invalidParams) setFieldErrors(e.data.invalidParams);
      } else {
        setError("Fetch bill failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    resetMessages();
    setPayResult(null);

    const billerId = selectedOperator?.operator_id;
    if (!billerId) {
      setError("Select a category and operator first.");
      return;
    }
    const utilityAccNo = String(form.utilityAccNo || "").trim();
    const customerMobile = String(form.customerMobile || "").trim();
    const amount = Number(form.amount);
    if (!utilityAccNo || !customerMobile) {
      setError("Enter utility account number and customer mobile.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await authedRequest("/api/bbps/pay", {
        method: "POST",
        body: {
          billerId,
          utilityAccNo,
          customerMobile,
          amount,
          senderName: form.senderName || undefined,
          latlong: form.latlong || DEFAULT_LATLONG,
        },
      });
      if (!res?.success) throw new Error(res?.message || "Payment failed");
      setPayResult(res.data);
      setSuccess("Bill payment initiated. Check transaction history.");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        if (e.data?.invalidParams) setFieldErrors(e.data.invalidParams);
      } else {
        setError("Payment failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "BBPS" ? "active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTab("BBPS");
            resetMessages();
          }}
        >
          Pay Bills (BBPS)
        </button>
        <button
          className={`tab ${activeTab === "PPI" ? "active" : ""}`}
          type="button"
          onClick={() => {
            setActiveTab("PPI");
            resetMessages();
          }}
        >
          PPI – DigiKhata
        </button>
      </div>

      {activeTab === "BBPS" && (
        <>
          <section className="section">
            <h3>Bill payment</h3>
            <p className="muted">
              Pay electricity, gas, water, DTH, mobile recharge and more. Select category and operator, then fetch bill
              or pay.
            </p>

            <div className="form inline" style={{ marginTop: "1rem" }}>
              <label>
                <span>Category</span>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedOperator(null);
                    setBillResult(null);
                    setPayResult(null);
                  }}
                  disabled={loading}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.operator_category_id} value={c.operator_category_id}>
                      {c.operator_category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Operator</span>
                <select
                  value={selectedOperator ? selectedOperator.operator_id : ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const op = operators.find((o) => String(o.operator_id) === id) || null;
                    setSelectedOperator(op);
                    setBillResult(null);
                    setPayResult(null);
                  }}
                  disabled={loading || !selectedCategoryId}
                >
                  <option value="">Select operator</option>
                  {operators.map((o) => (
                    <option key={o.operator_id} value={o.operator_id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {selectedOperator && (
            <section className="section">
              <h3>Bill details</h3>
              <form className="form inline" onSubmit={handleFetchBill}>
                <label>
                  <span>Utility / Account number</span>
                  <input
                    value={form.utilityAccNo}
                    onChange={(e) => setForm((f) => ({ ...f, utilityAccNo: e.target.value }))}
                    placeholder="Account or consumer number"
                    disabled={loading}
                  />
                </label>
                <label>
                  <span>Customer mobile</span>
                  <input
                    value={form.customerMobile}
                    onChange={(e) => setForm((f) => ({ ...f, customerMobile: e.target.value }))}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    disabled={loading}
                  />
                </label>
                <label>
                  <span>Sender name (optional)</span>
                  <input
                    value={form.senderName}
                    onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                    placeholder="Your name"
                    disabled={loading}
                  />
                </label>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? "Fetching..." : "Fetch bill"}
                </button>
              </form>

              {billResult && (
                <div className="bbps-panel">
                  <div className="bbps-panel-header">
                    <span className="bbps-panel-label">Bill fetched</span>
                    <span className="bbps-panel-tag">Preview</span>
                  </div>
                  <div className="bbps-panel-body">
                    {(() => {
                      const raw = billResult.data?.data ?? billResult.data ?? billResult;
                      const cleaned = sanitizePreview(raw);
                      if (!cleaned) {
                        return (
                          <div className="muted">
                            No bill details returned from provider. Please verify inputs and try again.
                          </div>
                        );
                      }
                      return <pre className="bbps-code">{JSON.stringify(cleaned, null, 2)}</pre>;
                    })()}
                    {billResult.data?.data?.amount && (
                      <div className="bbps-kv">
                        <span>Due amount: ₹{billResult.data.data.amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedOperator && (
            <section className="section">
              <h3>Pay bill</h3>
              <form className="form inline" onSubmit={handlePayBill}>
                <label>
                  <span>Amount (₹)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="Amount"
                    required
                    disabled={loading}
                  />
                </label>
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? "Processing..." : "Pay bill"}
                </button>
              </form>
              <p className="muted">
                Use the same utility account and mobile as above. Fetch bill first to see due amount.
              </p>

              {payResult && (
                <div className="bbps-panel">
                  <div className="bbps-panel-header">
                    <span className="bbps-panel-label">Payment result</span>
                    <span className="bbps-panel-tag">{payResult.transaction?.status ?? "—"}</span>
                  </div>
                  <div className="bbps-panel-body">
                    <div className="bbps-kv">
                      <span>Transaction ID: {payResult.transaction?._id ?? "—"}</span>
                      {typeof payResult.eko === "object" && <span>Gateway: Eko</span>}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {activeTab === "PPI" && (
        <section className="section">
          <h3>PPI – DigiKhata transaction</h3>
          <p className="muted">
            Initiate a prepaid payment instrument (PPI) transaction via DigiKhata. Use sender mobile, recipient account
            and amount.
          </p>

          <form className="form inline" onSubmit={handlePpiSubmit}>
            <label>
              <span>Sender mobile</span>
              <input
                value={form.customerMobile}
                onChange={(e) => setForm((f) => ({ ...f, customerMobile: e.target.value }))}
                placeholder="10-digit mobile"
                maxLength={10}
                disabled={loading}
              />
            </label>
            <label>
              <span>Recipient account / wallet ID</span>
              <input
                value={form.utilityAccNo}
                onChange={(e) => setForm((f) => ({ ...f, utilityAccNo: e.target.value }))}
                placeholder="Account or wallet identifier"
                disabled={loading}
              />
            </label>
            <label>
              <span>Amount (₹)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
                required
                disabled={loading}
              />
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Initiate PPI transaction"}
            </button>
          </form>

          {ppiResult && (
            <div className="bbps-panel" style={{ marginTop: "1rem" }}>
              <div className="bbps-panel-header">
                <span className="bbps-panel-label">PPI transaction result</span>
                <span className="bbps-panel-tag">{ppiResult.transaction?.status ?? "—"}</span>
              </div>
              <div className="bbps-panel-body">
                <div className="bbps-kv">
                  <span>Transaction ID: {ppiResult.transaction?._id ?? "—"}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {loading && categories.length === 0 && (
        <div className="loading-container">
          <div className="loader" />
          <span>Loading categories...</span>
        </div>
      )}
      {error && <div className="alert error">{error}</div>}
      {fieldErrors?.sender_name && (
        <div className="alert error" style={{ marginTop: "0.5rem" }}>
          {fieldErrors.sender_name}
        </div>
      )}
      {success && <div className="alert success">{success}</div>}
    </div>
  );
}
