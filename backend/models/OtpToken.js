import mongoose from "mongoose";

const otpTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: { type: String, enum: ["LOGIN", "TRANSFER"], required: true },
    code: { type: String, required: true },        // 6-digit
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    idempotencyKey: { type: String },              // optional for action-specific OTP
  },
  { timestamps: true }
);

otpTokenSchema.index({ user: 1, purpose: 1, expiresAt: 1 });

export default mongoose.model("OtpToken", otpTokenSchema);
