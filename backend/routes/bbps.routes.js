import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { activate, categories, getBill, operators, payment } from "../controllers/bbps.controller.js";

const router = Router();

router.put("/activate", activate);

router.use(requireAuth);
router.get("/categories", categories);
router.get("/operators/:categoryId", operators);
router.post("/fetch-bill", getBill);
router.post("/pay", payment);

export default router;

