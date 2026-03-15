import Transaction from "../models/Transaction.model.js";
import {
  activateBBPS,
  fetchBill,
  getCategories,
  getOperators,
  payBill,
} from "../services/bbps.service.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function isEkoFailure(payload) {
  if (!payload || typeof payload !== "object") return false;

  // EKO official docs: response_status_id = 1 means failure, 0 means success
  if (payload.response_status_id === 1) return true;

  // Additional fallback checks for other failure structures
  const rt = payload.response_type_id;
  if (typeof rt === "number" && rt < 0) return true;

  const reason = payload.reason;
  if (typeof reason === "string" && reason.toLowerCase().includes("missing parameter")) return true;

  const status = payload.status;
  if (typeof status === "number" && status >= 100) return true;
  
  return false;
}

function normalizeEkoError(payload) {
  const rawMessage = payload?.message || payload?.reason || "";
  let message = rawMessage || "Payment failed. Please try again or contact support.";

  const lowerMessage = rawMessage.toLowerCase();
  
  // Replace technical technical jargon with human-readable messages
  if (lowerMessage.includes("okeykey") || lowerMessage.includes("request to bbps")) {
    message = "Biller system is temporarily busy. Please try again after some time.";
  } else if (lowerMessage.includes("jdbc") || lowerMessage.includes("hibernate") || lowerMessage.includes("internal error")) {
    message = "External bank server is experiencing technical issues. Please try again later.";
  }

  return { 
    message, 
    invalidParams: payload?.invalid_params,
    raw: payload 
  };
}

function sendError(res, e) {
  const status = e?.response?.status || e?.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: "Bank server error. Please try again.",
  });
}

export async function activate(req, res) {
  try {
    const { latlong } = req.body || {};
    const result = await activateBBPS({ latlong });
    return res.json({ success: true, data: result });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function categories(req, res) {
  try {
    const result = await getCategories();
    return res.json({ success: true, data: result });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function operators(req, res) {
  try {
    const { categoryId } = req.params;
    if (!categoryId) throw badRequest("categoryId is required");
    const result = await getOperators(categoryId);
    return res.json({ success: true, data: result });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function getBill(req, res) {
  try {
    const { billerId, utilityAccNo, customerMobile, senderName, latlong, hcChannel, amount } = req.body || {};
    if (!billerId) throw badRequest("billerId is required");
    if (!utilityAccNo) throw badRequest("utilityAccNo is required");
    if (!customerMobile) throw badRequest("customerMobile is required");

    const result = await fetchBill({
      billerId,
      utilityAccNo,
      customerMobile,
      senderName,
      latlong,
      hcChannel,
      amount: amount || undefined,
    });

    if (isEkoFailure(result?.data)) {
      const norm = normalizeEkoError(result.data);
      return res.status(400).json({
        success: false,
        message: norm.message,
        ...(norm.invalidParams ? { invalidParams: norm.invalidParams } : {}),
      });
    }

    return res.json({ success: true, data: result });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function payment(req, res) {
  try {
    const { billerId, utilityAccNo, customerMobile, amount, senderName, latlong, hcChannel } = req.body || {};
    if (!billerId) throw badRequest("billerId is required");
    if (!utilityAccNo) throw badRequest("utilityAccNo is required");
    if (!customerMobile) throw badRequest("customerMobile is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");

    const clientRefId = `BBPS_${Date.now()}`;

    const tx = await Transaction.create({
      amount: amt,
      type: "BBPS",
      status: "PENDING",
      initiatedBy: req.user?.id,
      idempotencyKey: clientRefId,
      meta: {
        billerId,
        utilityAccNo,
        customerMobile,
        clientRefId,
      },
    });

    try {
      const result = await payBill({
        billerId,
        utilityAccNo,
        customerMobile,
        amount: amt,
        senderName,
        latlong,
        hcChannel,
        clientRefId,
      });

      if (isEkoFailure(result?.data)) {
        const norm = normalizeEkoError(result.data);
        tx.status = "FAILED";
        tx.meta = {
          ...tx.meta,
          ekoResponse: result,
        };
        await tx.save();

        return res.status(400).json({
          success: false,
          message: norm.message,
          ...(norm.invalidParams ? { invalidParams: norm.invalidParams } : {}),
        });
      }

      tx.status = "SUCCESS";
      tx.meta = {
        ...tx.meta,
        ekoResponse: result,
      };
      await tx.save();

      return res.json({ success: true, data: { transaction: tx, eko: result } });
    } catch (apiErr) {
      tx.status = "FAILED";
      tx.meta = {
        ...tx.meta,
        ekoResponse: {
          message: apiErr?.message,
          response: apiErr?.response?.data,
          status: apiErr?.response?.status,
        },
      };
      await tx.save();

      throw apiErr;
    }
  } catch (e) {
    return sendError(res, e);
  }
}

