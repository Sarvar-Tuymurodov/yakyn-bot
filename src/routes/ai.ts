import { Router, Response } from "express";
import { aiService } from "../services/ai.service.js";
import { contactService } from "../services/contact.service.js";
import { AuthenticatedRequest, devAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

router.use(devAuthMiddleware);

// POST /api/ai/suggestions - Get message suggestions for a contact
router.post("/suggestions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      res.status(400).json({ error: "contactId is required" });
      return;
    }

    const contact = await contactService.findById(parseInt(contactId));

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    if (contact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Calculate days since last contact
    let daysSinceContact: number | null = null;
    if (contact.lastContactAt) {
      const lastContact = new Date(contact.lastContactAt);
      const now = new Date();
      daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate days until birthday
    let birthdayInDays: number | null = null;
    if (contact.birthday) {
      const birthday = new Date(contact.birthday);
      const now = new Date();
      const thisYear = now.getFullYear();

      // Set times to midnight for accurate day comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const birthdayThisYear = new Date(thisYear, birthday.getMonth(), birthday.getDate());

      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(thisYear + 1);
      }

      birthdayInDays = Math.round((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const language = req.dbUser!.language as "ru" | "uz";

    const suggestions = await aiService.generateSuggestions({
      contactName: contact.name,
      notes: contact.notes,
      daysSinceContact,
      birthdayInDays,
      language,
    });

    res.json({ suggestions });
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// POST /api/ai/transcribe - Transcribe audio to text
router.post("/transcribe", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { audio } = req.body; // base64 encoded audio

    if (!audio) {
      res.status(400).json({ error: "audio is required (base64)" });
      return;
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, "base64");

    const language = req.dbUser!.language as "ru" | "uz";

    const text = await aiService.transcribeAudio(audioBuffer, language);

    res.json({ text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

export default router;
