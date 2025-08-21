import User from "../models/User.model.js";
import Transaction from "../models/Transaction.model.js";
import AuditLog from "../models/AuditLog.js";

export async function listUsers(req, res) {
  const { q, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (q) filter.$or = [
    { name: new RegExp(q, "i") },
    { email: new RegExp(q, "i") }
  ];
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select("-password"),
    User.countDocuments(filter)
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

export async function suspendUser(req, res) {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { status: "SUSPENDED" }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });

  await AuditLog.create({
    actor: req.user.id,
    action: "USER_SUSPEND",
    targetUser: id,
    level: "WARN",
    metadata: {}
  });

  res.json({ message: "User suspended", user });
}

export async function activateUser(req, res) {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { status: "ACTIVE" }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });

  await AuditLog.create({
    actor: req.user.id,
    action: "USER_ACTIVATE",
    targetUser: id,
    level: "INFO",
  });

  res.json({ message: "User activated", user });
}

export async function listTransactions(req, res) {
  const { page = 1, limit = 20, userId } = req.query;
  const filter = {};
  if (userId) filter.initiatedBy = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate("fromAccount toAccount initiatedBy", "accountNumber email name"),
    Transaction.countDocuments(filter)
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

export async function listAuditLogs(req, res) {
  const { page = 1, limit = 50, action } = req.query;
  const filter = {};
  if (action) filter.action = action;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate("actor targetUser", "email name"),
    AuditLog.countDocuments(filter)
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}
