import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  getDashboardStats,
  getAllAgents,
  approveAgent,
  rejectAgent,
  deleteAgent,
  editAgent,
  getAgentTransactions,
  getAllUsers,
  toggleUserBlock,
  getAllTransactions,
  listAuditLogs,
  listUsers,
  suspendUser,
  activateUser,
  listTransactions
} from "../controllers/admin.controller.js";

const router = Router();

router.use(requireAuth, isAdmin);

// Dashboard Overview
router.get("/dashboard/stats", getDashboardStats);

// AEPS Agent Management
router.get("/agents", getAllAgents);
router.put("/agents/:id/approve", approveAgent);
router.put("/agents/:id/reject", rejectAgent);
router.delete("/agents/:id", deleteAgent);
router.put("/agents/:id/edit", editAgent);
router.get("/agents/:id/transactions", getAgentTransactions);

// User Management
router.get("/users", getAllUsers);
router.put("/users/:id/block", toggleUserBlock);
router.get("/users/:id/transactions", getAllTransactions);

// Transaction Management
router.get("/transactions", getAllTransactions);

// Audit Logs
router.get("/logs", listAuditLogs);

// Legacy endpoints for compatibility
router.put("/users/:id/suspend", suspendUser);
router.put("/users/:id/activate", activateUser);

export default router;
