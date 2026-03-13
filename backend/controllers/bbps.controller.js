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
  // EKO often returns HTTP 200 with response_type_id -1 for validation failures.
  const rt = payload.response_type_id;
  if (typeof rt === "number" && rt < 0) return true;

  const reason = payload.reason;
  if (typeof reason === "string" && reason.toLowerCase().includes("missing parameter")) return true;

  // Some EKO responses include status/message without response_type_id.
  const status = payload.status;
  if (typeof status === "number" && status >= 100) return true;
  return false;
}

function normalizeEkoError(payload) {
  const reason =
    typeof payload?.reason === "string" && payload.reason.trim()
      ? payload.reason.trim()
      : undefined;

  const reasonMsg = reason
    ? reason
        .replace(/\|+/g, " | ")
        .replace(/\s+/g, " ")
        .replace(/\s\|\s/g, " ")
        .trim()
    : undefined;

  let message =
    (typeof payload?.message === "string" && payload.message.trim()) ||
    reasonMsg ||
    "EKO request failed";

  const lower = message.toLowerCase();
  if (
    lower.includes("error while posting request to bbps") ||
    lower.includes("last_used_okeykey")
  ) {
    message = "Payment failed at biller network. Please try again later or contact support.";
  }

  const invalidParams =
    payload?.invalid_params && typeof payload.invalid_params === "object"
      ? payload.invalid_params
      : undefined;

  return { message, invalidParams, raw: payload };
}

function sendError(res, e) {
  const status = e?.response?.status || e?.statusCode || 500;
  const details = e?.response?.data;

  const contentType = e?.response?.headers?.["content-type"];
  const isHtml =
    typeof details === "string" &&
    (details.includes("<html") || details.includes("<HTML") || contentType?.includes("text/html"));

  function summarizeHtml(html) {
    const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
    const h1 = /<h1[^>]*>([^<]*)<\/h1>/i.exec(html)?.[1]?.trim();
    const rootCause = /<b>\s*root cause\s*<\/b>\s*<pre>([\s\S]*?)<\/pre>/i.exec(html)?.[1];
    const exception = /<b>\s*exception\s*<\/b>\s*<pre>([\s\S]*?)<\/pre>/i.exec(html)?.[1];
    const pick = (s) =>
      String(s || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6)
        .join("\n");

    const text = String(html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<\/?(br|p|hr|h1|h2|h3)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, "\"")
      .replace(/&amp;/g, "&")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    const textSnippet = text ? text.slice(0, 400) : undefined;

    return {
      upstream_title: title,
      upstream_h1: h1,
      upstream_exception: exception ? pick(exception) : undefined,
      upstream_root_cause: rootCause ? pick(rootCause) : undefined,
      upstream_snippet: textSnippet,
    };
  }

  const safeDetails = isHtml
    ? { type: "html_error", ...summarizeHtml(details) }
    : details;

  let errorMessage = e?.message || "Request failed";
  if (safeDetails && typeof safeDetails === "object") {
    // Eko sometimes provides exact error strings in these fields
    if (safeDetails.message) errorMessage = safeDetails.message;
    else if (safeDetails.reason) errorMessage = safeDetails.reason;
    else if (safeDetails.error) errorMessage = safeDetails.error;
    else if (safeDetails.upstream_snippet) errorMessage = safeDetails.upstream_snippet;
  }

  const upstreamStatus = e?.response?.status;
  
  if (e.response) {
    console.error("--- BBPS EKO ERROR DEBUG ---");
    console.error("Status:", e.response.status);
    console.error("Body:", JSON.stringify(e.response.data, null, 2));
    console.error("-----------------------------");
  }

  return res.status(status).json({
    success: false,
    message: errorMessage,
    ...(upstreamStatus ? { upstreamStatus } : {}),
    ...(safeDetails !== undefined ? { details: safeDetails } : {}),
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
      amount,
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

