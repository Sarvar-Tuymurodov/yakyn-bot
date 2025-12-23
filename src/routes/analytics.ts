import { Router, Response } from "express";
import { analyticsService, type AnalyticsEventType } from "../services/analytics.service.js";
import { AuthenticatedRequest, devAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

router.use(devAuthMiddleware);

// Track an event from frontend
router.post("/track", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.dbUser?.id;
    const { event, metadata } = req.body as {
      event: AnalyticsEventType;
      metadata?: Record<string, string | number | boolean | null>;
    };

    if (!event) {
      res.status(400).json({ error: "Event type is required" });
      return;
    }

    await analyticsService.track({
      userId,
      event,
      metadata,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to track event:", error);
    res.status(500).json({ error: "Failed to track event" });
  }
});

// Get analytics summary (admin only - you might want to add auth)
router.get("/summary", async (_req, res) => {
  try {
    const summary = await analyticsService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error("Failed to get summary:", error);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// Get daily active users
router.get("/dau", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const dau = await analyticsService.getDailyActiveUsers(days);
    res.json(dau);
  } catch (error) {
    console.error("Failed to get DAU:", error);
    res.status(500).json({ error: "Failed to get DAU" });
  }
});

export default router;
