 import Transaction from "../models/Transaction.model.js";
import Account from "../models/Account.model.js";
import {
  addRecipient,
  addRecipientBank,
  getRecipients,
  getSenderInformation,
  initiateTransaction,
  onboardSender,
  sendTransactionOtp,
  transactionInquiry,
  validateSenderAadhaar,
  validateSenderPan,
  verifyCustomerOtp,
} from "../services/digikhataPpi.service.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function mapTxStatus(providerData) {
  const txStatus = providerData?.tx_status;
  if (typeof txStatus === "number") {
    if (txStatus === 0) return "SUCCESS";
    if (txStatus === 1) return "FAILED";
    if (txStatus === 2 || txStatus === 3 || txStatus === 5) return "PENDING";
    if (txStatus === 4) return "SUCCESS";
  }
  return "PENDING";
}

function normalizeEkoError(payload) {
  const rawMessage = payload?.message || payload?.reason || "";
  let message = rawMessage || "Transaction failed";

  const lowerMessage = rawMessage.toLowerCase();

  // Replace technical technical jargon with human-readable messages
  if (lowerMessage.includes("okeykey") || lowerMessage.includes("request to bbps")) {
    message = "Bank system is temporarily busy. Please try again after some time.";
  } else if (lowerMessage.includes("jdbc") || lowerMessage.includes("hibernate") || lowerMessage.includes("internal error")) {
    message = "External bank server is experiencing technical issues. Please try again later.";
  }

  return { message, raw: payload };
}

function sendError(res, e) {
  const status = e?.statusCode || e?.response?.status || 500;
  const message = e?.message || "Bank server error. Please try again.";
  return res.status(status).json({
    success: false,
    message,
  });
}

// -------------------- Sender --------------------

export async function senderInfo(req, res) {
  try {
    const { customerId } = req.params;
    if (!customerId) throw badRequest("customerId is required");
    const data = await getSenderInformation({ customerId });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderOnboard(req, res) {
  try {
    const { customerId, name, mobile, extra } = req.body || {};
    if (!customerId && !mobile) throw badRequest("customerId or mobile is required");
    const data = await onboardSender({ customerId, name, mobile, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderVerifyOtp(req, res) {
  try {
    const { customerId, otp, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!otp) throw badRequest("otp is required");
    const data = await verifyCustomerOtp({ customerId, otp, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderValidateAadhaar(req, res) {
  try {
    const { customerId } = req.params;
    const { aadhaar, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!aadhaar) throw badRequest("aadhaar is required");
    const data = await validateSenderAadhaar({ customerId, aadhaar, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function senderValidatePan(req, res) {
  try {
    const { customerId } = req.params;
    const { pan, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!pan) throw badRequest("pan is required");
    const data = await validateSenderPan({ customerId, pan, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

// -------------------- Recipients --------------------

export async function recipientList(req, res) {
  try {
    const { customerId } = req.params;
    if (!customerId) throw badRequest("customerId is required");
    const data = await getRecipients({ customerId });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function recipientAdd(req, res) {
  try {
    const { customerId } = req.params;
    const { name, mobile, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!name) throw badRequest("name is required");
    if (!mobile) throw badRequest("mobile is required");
    const data = await addRecipient({ customerId, name, mobile, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function recipientAddBank(req, res) {
  try {
    const { customerId } = req.params;
    const { recipientId, accountNumber, ifsc, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!recipientId) throw badRequest("recipientId is required");
    if (!accountNumber) throw badRequest("accountNumber is required");
    if (!ifsc) throw badRequest("ifsc is required");
    const data = await addRecipientBank({ customerId, recipientId, accountNumber, ifsc, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

// -------------------- Transactions --------------------

export async function txnSendOtp(req, res) {
  try {
    const { customerId } = req.params;
    const { amount, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");
    const data = await sendTransactionOtp({ customerId, amount: amt, extra });
    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

export async function txnInitiate(req, res) {
  try {
    const { customerId } = req.params;
    const { recipientId, amount, otp, extra } = req.body || {};
    if (!customerId) throw badRequest("customerId is required");
    if (!recipientId) throw badRequest("recipientId is required");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");
    if (!otp) throw badRequest("otp is required (use 123456 in mock mode)");

    const clientRefId = `PPI_${Date.now()}`;

    const tx = await Transaction.create({
      amount: amt,
      type: "PPI",
      status: "PENDING",
      initiatedBy: req.user?.id,
      idempotencyKey: clientRefId,
      meta: {
        channel: "PPI_DIGIKHATA",
        customerId,
        recipientId,
        clientRefId,
      },
    });

    try {
      const provider = await initiateTransaction({
        customerId,
        recipientId,
        amount: amt,
        otp,
        clientRefId,
        extra,
      });

      const finalStatus = mapTxStatus(provider);
      tx.status = finalStatus;
      tx.meta = { ...tx.meta, providerResponse: provider };
      await tx.save();

      // ✅ Deduct balance if SUCCESS
      if (finalStatus === "SUCCESS") {
        const acc = await Account.findOne({ user: req.user.id, status: "ACTIVE" });
        if (acc) {
          acc.balance -= amt;
          await acc.save();
          tx.fromAccount = acc._id;
          await tx.save();
        }
      }

      if (finalStatus === "FAILED") {
        const norm = normalizeEkoError(provider);
        return res.status(400).json({
          success: false,
          message: norm.message,
          transaction: tx,
          provider,
        });
      }

      return res.json({
        success: true,
        data: { transaction: tx, provider },
      });
    } catch (err) {
      tx.status = "FAILED";
      tx.meta = {
        ...tx.meta,
        providerError: {
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
        },
      };
      await tx.save();
      throw err;
    }
  } catch (e) {
    return sendError(res, e);
  }
}

export async function txnInquiry(req, res) {
  try {
    const { clientRefId } = req.params;
    if (!clientRefId) throw badRequest("clientRefId is required");
    const data = await transactionInquiry({ clientRefId });

    // ✅ Update local transaction status if it was PENDING
    const tx = await Transaction.findOne({ idempotencyKey: clientRefId });
    if (tx && tx.status === "PENDING") {
      const newStatus = mapTxStatus(data);
      if (newStatus !== "PENDING") {
        tx.status = newStatus;
        tx.meta = { ...tx.meta, inquiryResponse: data };
        await tx.save();

        if (newStatus === "SUCCESS") {
          const amt = tx.amount;
          const acc = await Account.findOne({ user: tx.initiatedBy, status: "ACTIVE" });
          if (acc) {
            acc.balance -= amt;
            await acc.save();
            tx.fromAccount = acc._id;
            await tx.save();

            // Special case for mock: if success upon inquiry, also deduct from mock limit
            if (process.env.USE_PPI_MOCK === "true") {
              const { getSenderInformation } = await import("../services/digikhataPpi.service.js");
              const sender = await getSenderInformation({ customerId: tx.meta.customerId });
              if (sender && typeof sender.remaining_limit === "number") {
                sender.remaining_limit -= amt;
              }
            }
          }
        }
      }
    }

    return res.json({ success: true, data });
  } catch (e) {
    return sendError(res, e);
  }
}

