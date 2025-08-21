import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who did it (nullable for system)
    action: { type: String, required: true }, // e.g. USER_SUSPEND, TRANSFER_CREATE, LOGIN_SUCCESS
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Object, default: {} },  // anything useful
    ip: String,
    userAgent: String,
    level: { type: String, enum: ["INFO", "WARN", "ERROR"], default: "INFO" }
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
