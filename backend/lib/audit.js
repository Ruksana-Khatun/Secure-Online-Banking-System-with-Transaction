import AuditLog from "../models/AuditLog.js";

export async function audit({ actor, action, targetUser, level = "INFO", metadata = {}, req }) {
  try {
    await AuditLog.create({
      actor,
      action,
      targetUser,
      level,
      metadata,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"]
    });
  } catch (e) {
    // don't crash on audit failure
    console.error("Audit error:", e.message);
  }
}
