import crypto from "crypto";
import OtpToken from "../models/OtpToken.js";
import User from "../models/User.model.js";
import { sendOtpEmail } from "../lib/mailer.js";
import AuditLog from "../models/AuditLog.js";

const CODE_TTL_MIN = 5;

function generateCode() {
  // 6-digit numeric
  return ("" + Math.floor(100000 + Math.random() * 900000));
}

// REQUEST OTP (for LOGIN or TRANSFER)
export async function requestOtp(req, res) {
  try {
    const { purpose, idempotencyKey } = req.body; // purpose: LOGIN | TRANSFER
    if (!["LOGIN", "TRANSFER"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid purpose" });
    }

    // who?
    const userId = purpose === "LOGIN" ? req.body.userId : req.user?.id;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "ACTIVE") return res.status(403).json({ error: "User not active" });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

    const otp = await OtpToken.create({
      user: user._id,
      purpose,
      code,
      expiresAt,
      idempotencyKey
    });

    await sendOtpEmail(user.email, code, purpose);

    await AuditLog.create({
      actor: user._id,
      action: "OTP_REQUEST",
      targetUser: user._id,
      metadata: { purpose },
      level: "INFO",
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.json({ message: "OTP sent", otpId: otp._id, expiresAt });
  } catch (e) {
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

// VERIFY OTP (LOGIN or TRANSFER)
export async function verifyOtp(req, res) {
  try {
    const { otpId, code } = req.body;
    const otp = await OtpToken.findById(otpId);
    if (!otp) return res.status(400).json({ error: "Invalid OTP" });
    if (otp.consumedAt) return res.status(400).json({ error: "OTP already used" });
    if (otp.expiresAt < new Date()) return res.status(400).json({ error: "OTP expired" });
    if (otp.code !== code) return res.status(400).json({ error: "Incorrect OTP" });

    otp.consumedAt = new Date();
    await otp.save();

    await AuditLog.create({
      actor: otp.user,
      action: "OTP_VERIFY",
      targetUser: otp.user,
      metadata: { purpose: otp.purpose },
      level: "INFO",
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    return res.json({ message: "OTP verified", purpose: otp.purpose });
  } catch {
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}
