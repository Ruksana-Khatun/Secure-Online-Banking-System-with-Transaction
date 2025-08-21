import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  listUsers, suspendUser, activateUser,
  listTransactions, listAuditLogs
} from "../controllers/admin.controller.js";

const router = Router();

router.use(requireAuth, isAdmin);

router.get("/users", listUsers);
router.put("/users/:id/suspend", suspendUser);
router.put("/users/:id/activate", activateUser);
router.get("/transactions", listTransactions);
router.get("/logs", listAuditLogs);

export default router;
