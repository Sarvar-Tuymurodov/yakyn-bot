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

// Get analytics summary (requires auth)
router.get("/summary", async (_req, res) => {
  try {
    const summary = await analyticsService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error("Failed to get summary:", error);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// Admin stats endpoint (uses ADMIN_TELEGRAM_ID)
router.get("/admin/stats", async (req, res) => {
  const telegramId = req.headers["x-telegram-id"] || req.query.tg;
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

  if (!adminTelegramId || String(telegramId) !== adminTelegramId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const summary = await analyticsService.getSummary();
    const dau = await analyticsService.getDailyActiveUsers(14);
    res.json({ ...summary, dailyActiveUsers: dau });
  } catch (error) {
    console.error("Failed to get admin stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
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
