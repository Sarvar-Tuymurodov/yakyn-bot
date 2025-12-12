import { Router, Response } from "express";
import { userService } from "../services/user.service.js";
import { contactService } from "../services/contact.service.js";
import { AuthenticatedRequest, devAuthMiddleware } from "../middlewares/auth.js";
import { Language } from "../locales/index.js";

const router = Router();

// Apply auth middleware to all routes
router.use(devAuthMiddleware);

// GET /api/user - Get current user info
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.dbUser!;

    // Get contact stats
    const contacts = await contactService.findByUserId(user.id);
    const overdue = await contactService.countOverdue(user.id);

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        language: user.language,
        timezone: user.timezone,
      },
      stats: {
        totalContacts: contacts.length,
        overdueContacts: overdue,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/user/settings - Update user settings
router.put("/settings", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const telegramId = req.dbUser!.telegramId;
    const { language, timezone } = req.body;

    const updateData: { language?: Language; timezone?: string } = {};

    // Validate language
    if (language !== undefined) {
      const validLanguages: Language[] = ["ru", "uz"];
      if (!validLanguages.includes(language)) {
        res.status(400).json({ error: "Invalid language. Must be 'ru' or 'uz'" });
        return;
      }
      updateData.language = language;
    }

    // Validate timezone
    if (timezone !== undefined) {
      const validTimezones = ["UTC+3", "UTC+5", "UTC+6"];
      if (!validTimezones.includes(timezone)) {
        res.status(400).json({ error: "Invalid timezone. Must be UTC+3, UTC+5, or UTC+6" });
        return;
      }
      updateData.timezone = timezone;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const user = await userService.update(telegramId, updateData);

    res.json({
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        language: user.language,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
