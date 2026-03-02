import Account from '../models/Account.model.js';
import Transaction from '../models/Transaction.model.js';
import User from "../models/User.model.js";
import OtpToken from "../models/OtpToken.js";
export async function transfer(req, res) {
  try {
    const { fromAccountId, toAccountNumber, amount, idempotencyKey, otpId, otpCode } = req.body;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount");
    if (!fromAccountId) throw new Error("fromAccountId required");
    if (!toAccountNumber || String(toAccountNumber).trim().length < 4) throw new Error("toAccountNumber required");
    if (!idempotencyKey) throw new Error("idempotencyKey required");

    const user = await User.findById(req.user.id).select("require2FAForTransfers status");
    if (!user) throw new Error("User not found");
    if (user.status !== "ACTIVE") throw new Error("User not active");

    let otpDoc = null;
    if (user.require2FAForTransfers) {
      if (!otpId || !otpCode) throw new Error("OTP required for transfer");
      if (!idempotencyKey) throw new Error("idempotencyKey required");

      otpDoc = await OtpToken.findById(otpId);
      if (!otpDoc) throw new Error("Invalid OTP");
      if (String(otpDoc.user) !== String(req.user.id)) throw new Error("Invalid OTP");
      if (otpDoc.purpose !== "TRANSFER") throw new Error("Invalid OTP");
      if (otpDoc.consumedAt) throw new Error("OTP already used");
      if (otpDoc.expiresAt < new Date()) throw new Error("OTP expired");
      if (otpDoc.code !== String(otpCode)) throw new Error("Incorrect OTP");
      if (otpDoc.idempotencyKey && otpDoc.idempotencyKey !== idempotencyKey) {
        throw new Error("OTP does not match transfer");
      }
    }

    const from = await Account.findOne({ _id: fromAccountId, user: req.user.id });
    const to = await Account.findOne({ accountNumber: toAccountNumber });

    if (!from || !to) throw new Error('Account not found');
    if (from.status !== 'ACTIVE' || to.status !== 'ACTIVE') throw new Error('Account blocked');
    if (from.balance < amt) throw new Error('Insufficient funds');

    from.balance -= amt;
    to.balance += amt;

    await from.save();
    await to.save();

    const tx = await Transaction.create({
      fromAccount: from._id,
      toAccount: to._id,
      amount: amt,
      type: 'TRANSFER',
      status: 'SUCCESS',
      initiatedBy: req.user.id,
      idempotencyKey
    });

    if (otpDoc) {
      otpDoc.consumedAt = new Date();
      await otpDoc.save();
    }
    return res.status(201).json({ message: 'Transfer success', tx });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

export async function history(req, res) {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const tx = await Transaction.find({ initiatedBy: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('fromAccount toAccount');

  return res.json(tx);
}
