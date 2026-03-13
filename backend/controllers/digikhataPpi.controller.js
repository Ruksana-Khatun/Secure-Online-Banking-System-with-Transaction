import Transaction from "../models/Transaction.model.js";
import { createPpiTransaction } from "../services/digikhataPpi.service.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function mapProviderStatus(providerData) {
  const txStatus = providerData?.tx_status;
  if (typeof txStatus === "number") {
    // EKO-style mapping from docs:
    // 0 Success, 1 Fail, 2 Initiated, 3 Refund Pending, 4 Refunded, 5 Hold
    if (txStatus === 0) return "SUCCESS";
    if (txStatus === 1) return "FAILED";
    if (txStatus === 2 || txStatus === 5 || txStatus === 3) return "PENDING";
    if (txStatus === 4) return "SUCCESS";
  }

  const code = providerData?.status_code ?? providerData?.code ?? providerData?.status;
  const text = String(code ?? "").toLowerCase();

  if (!text) return "SUCCESS";
  if (text.includes("pending")) return "PENDING";
  if (text.includes("fail") || text.includes("error")) return "FAILED";

  // Some providers use numeric codes like "00" for success.
  if (text === "00" || text === "success") return "SUCCESS";
  return "SUCCESS";
}

export async function initiatePpiTransaction(req, res) {
  try {
    const { senderMobile, recipientAccount, amount, description } = req.body || {};

    if (!senderMobile) throw badRequest("senderMobile is required");
    if (!recipientAccount) throw badRequest("recipientAccount is required");

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw badRequest("amount must be a positive number");

    const clientRefId = `PPI_${Date.now()}`;

    const tx = await Transaction.create({
      amount: amt,
      type: "PPI",
      status: "PENDING",
      initiatedBy: req.user?.id,
      idempotencyKey: clientRefId,
      meta: {
        channel: "DIGIKHATA_PPI",
        senderMobile,
        recipientAccount,
        description,
        clientRefId,
      },
    });

    try {
      const providerData = await createPpiTransaction({
        senderMobile,
        recipientAccount,
        amount: amt,
        clientRefId,
        description,
      });

      const finalStatus = mapProviderStatus(providerData);
      tx.status = finalStatus;
      tx.meta = {
        ...tx.meta,
        providerResponse: providerData,
      };
      await tx.save();

      if (finalStatus === "FAILED") {
        return res.status(400).json({
          success: false,
          message: providerData?.message || "PPI transaction failed",
          transaction: tx,
        });
      }

      return res.json({
        success: true,
        data: {
          transaction: tx,
          provider: providerData,
        },
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
    const status = e.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: e?.message || "PPI transaction failed",
    });
  }
}

