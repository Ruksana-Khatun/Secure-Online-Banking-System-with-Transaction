import { Router } from "express";
import { register } from "../controllers/auth.controller.js";
import { createAccount } from "../controllers/account.controller.js";
import { listUsers } from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { me } from "../controllers/user.controller.js";

const router = Router();

// Common non-/api aliases (helps older clients)
router.post("/users", register);
router.get("/users", requireAuth, isAdmin, listUsers);
router.post("/createAccount", requireAuth, createAccount);
router.get("/user", requireAuth, me);

// Avoid confusing silent 404s for POST /user (seen in logs)
router.post("/user", (_req, res) => res.status(405).json({ error: "Use PATCH /user (not implemented) or POST /users" }));

export default router;

