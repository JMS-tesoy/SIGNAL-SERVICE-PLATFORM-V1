import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { subscribeDashboardRealtime } from "../services/realtime.service.js";

const router = Router();

router.get("/dashboard", authenticate, (req, res) => {
  subscribeDashboardRealtime(req.user!.id, req, res);
});

export default router;
