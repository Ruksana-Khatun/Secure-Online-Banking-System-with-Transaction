import User from "../models/User.model.js";

export async function me(req, res) {
  const user = await User.findById(req.user.id).select("_id fullName email role status createdAt updatedAt");
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
}

