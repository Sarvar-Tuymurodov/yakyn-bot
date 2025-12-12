import { Router, Response } from "express";
import { contactService, Frequency } from "../services/contact.service.js";
import { AuthenticatedRequest, devAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

// Apply auth middleware to all routes
router.use(devAuthMiddleware);

// GET /api/contacts - List all contacts for user
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.dbUser!.id;
    const contacts = await contactService.findByUserId(userId);

    // Calculate status for each contact
    const now = new Date();
    const contactsWithStatus = contacts.map((contact) => {
      const nextReminder = contact.snoozedUntil ?? contact.nextReminderAt;
      const diffMs = nextReminder.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: "overdue" | "today" | "upcoming";
      if (diffDays < 0) {
        status = "overdue";
      } else if (diffDays === 0) {
        status = "today";
      } else {
        status = "upcoming";
      }

      return {
        id: contact.id,
        name: contact.name,
        frequency: contact.frequency,
        reminderTime: contact.reminderTime,
        lastContactAt: contact.lastContactAt,
        nextReminderAt: nextReminder,
        status,
        daysUntil: diffDays,
      };
    });

    res.json({ contacts: contactsWithStatus });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// GET /api/contacts/:id - Get single contact
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contactId = parseInt(req.params.id);
    const contact = await contactService.findById(contactId);

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    // Verify ownership
    if (contact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json({ contact });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /api/contacts - Create new contact
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, frequency, reminderTime } = req.body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const validFrequencies: Frequency[] = ["weekly", "biweekly", "monthly", "quarterly"];
    if (!validFrequencies.includes(frequency)) {
      res.status(400).json({ error: "Invalid frequency" });
      return;
    }

    const validTimes = ["08:00", "09:00", "10:00", "12:00", "14:00", "18:00", "20:00", "21:00", "22:00"];
    if (!validTimes.includes(reminderTime)) {
      res.status(400).json({ error: "Invalid reminder time" });
      return;
    }

    const contact = await contactService.create({
      userId: req.dbUser!.id,
      name: name.trim(),
      frequency,
      reminderTime,
    });

    res.status(201).json({ contact });
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// PUT /api/contacts/:id - Update contact
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contactId = parseInt(req.params.id);
    const existingContact = await contactService.findById(contactId);

    if (!existingContact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    // Verify ownership
    if (existingContact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const { name, frequency, reminderTime } = req.body;
    const updateData: { name?: string; frequency?: Frequency; reminderTime?: string } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Invalid name" });
        return;
      }
      updateData.name = name.trim();
    }

    if (frequency !== undefined) {
      const validFrequencies: Frequency[] = ["weekly", "biweekly", "monthly", "quarterly"];
      if (!validFrequencies.includes(frequency)) {
        res.status(400).json({ error: "Invalid frequency" });
        return;
      }
      updateData.frequency = frequency;
    }

    if (reminderTime !== undefined) {
      const validTimes = ["08:00", "09:00", "10:00", "12:00", "14:00", "18:00", "20:00", "21:00", "22:00"];
      if (!validTimes.includes(reminderTime)) {
        res.status(400).json({ error: "Invalid reminder time" });
        return;
      }
      updateData.reminderTime = reminderTime;
    }

    const contact = await contactService.update(contactId, updateData);
    res.json({ contact });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contactId = parseInt(req.params.id);
    const existingContact = await contactService.findById(contactId);

    if (!existingContact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    // Verify ownership
    if (existingContact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    await contactService.delete(contactId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// POST /api/contacts/:id/contacted - Mark as contacted
router.post("/:id/contacted", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contactId = parseInt(req.params.id);
    const existingContact = await contactService.findById(contactId);

    if (!existingContact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    // Verify ownership
    if (existingContact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const contact = await contactService.markContacted(contactId);
    res.json({ contact });
  } catch (error) {
    console.error("Error marking contacted:", error);
    res.status(500).json({ error: "Failed to mark as contacted" });
  }
});

// POST /api/contacts/:id/snooze - Snooze until tomorrow
router.post("/:id/snooze", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contactId = parseInt(req.params.id);
    const existingContact = await contactService.findById(contactId);

    if (!existingContact) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }

    // Verify ownership
    if (existingContact.userId !== req.dbUser!.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const contact = await contactService.snoozeUntilTomorrow(contactId);
    res.json({ contact });
  } catch (error) {
    console.error("Error snoozing contact:", error);
    res.status(500).json({ error: "Failed to snooze contact" });
  }
});

export default router;
