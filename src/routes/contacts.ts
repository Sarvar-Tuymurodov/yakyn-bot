import { Router, Response } from "express";
import { contactService, Frequency } from "../services/contact.service.js";
import { AuthenticatedRequest, devAuthMiddleware } from "../middlewares/auth.js";

const router = Router();

// Apply auth middleware to all routes
router.use(devAuthMiddleware);

// Helper to compute contact status
function computeContactStatus(contact: {
  id: number;
  name: string;
  frequency: string;
  reminderTime: string;
  notes: string | null;
  birthday: Date | null;
  lastContactAt: Date | null;
  nextReminderAt: Date;
  snoozedUntil: Date | null;
}) {
  const now = new Date();
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
    notes: contact.notes,
    birthday: contact.birthday,
    lastContactAt: contact.lastContactAt,
    nextReminderAt: nextReminder,
    status,
    daysUntil: diffDays,
  };
}

// GET /api/contacts - List all contacts for user
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.dbUser!.id;
    const contacts = await contactService.findByUserId(userId);
    const contactsWithStatus = contacts.map(computeContactStatus);
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

    res.json({ contact: computeContactStatus(contact) });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /api/contacts - Create new contact
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, frequency, reminderTime, notes, birthday } = req.body;

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

    // Parse birthday if provided
    let birthdayDate: Date | undefined;
    if (birthday) {
      birthdayDate = new Date(birthday);
      if (isNaN(birthdayDate.getTime())) {
        res.status(400).json({ error: "Invalid birthday format" });
        return;
      }
    }

    const contact = await contactService.create({
      userId: req.dbUser!.id,
      name: name.trim(),
      frequency,
      reminderTime,
      notes: notes?.trim() || undefined,
      birthday: birthdayDate,
    });

    res.status(201).json({ contact: computeContactStatus(contact) });
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// POST /api/contacts/import - Import contacts from phone
router.post("/import", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: "Contacts array is required" });
      return;
    }

    if (contacts.length > 50) {
      res.status(400).json({ error: "Maximum 50 contacts can be imported at once" });
      return;
    }

    const userId = req.dbUser!.id;
    const importedContacts = [];

    for (const c of contacts) {
      if (!c.name || typeof c.name !== "string" || c.name.trim().length === 0) {
        continue; // Skip invalid contacts
      }

      const contact = await contactService.create({
        userId,
        name: c.name.trim(),
        frequency: "monthly", // Default frequency for imported contacts
        reminderTime: "10:00", // Default time
        notes: c.notes?.trim() || undefined,
      });

      importedContacts.push(computeContactStatus(contact));
    }

    res.status(201).json({
      imported: importedContacts.length,
      contacts: importedContacts,
    });
  } catch (error) {
    console.error("Error importing contacts:", error);
    res.status(500).json({ error: "Failed to import contacts" });
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

    const { name, frequency, reminderTime, notes, birthday } = req.body;
    const updateData: {
      name?: string;
      frequency?: Frequency;
      reminderTime?: string;
      notes?: string | null;
      birthday?: Date | null;
    } = {};

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

    // Handle notes (can be set to null to clear)
    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    // Handle birthday (can be set to null to clear)
    if (birthday !== undefined) {
      if (birthday === null) {
        updateData.birthday = null;
      } else {
        const birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
          res.status(400).json({ error: "Invalid birthday format" });
          return;
        }
        updateData.birthday = birthdayDate;
      }
    }

    const contact = await contactService.update(contactId, updateData);
    res.json({ contact: contact ? computeContactStatus(contact) : null });
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
    const { note } = req.body as { note?: string };
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

    const contact = await contactService.markContacted(contactId, note);
    res.json({ contact: contact ? computeContactStatus(contact) : null });
  } catch (error) {
    console.error("Error marking contacted:", error);
    res.status(500).json({ error: "Failed to mark as contacted" });
  }
});

// GET /api/contacts/:id/history - Get contact history
router.get("/:id/history", async (req: AuthenticatedRequest, res: Response) => {
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

    const history = await contactService.getHistory(contactId);
    res.json({ history });
  } catch (error) {
    console.error("Error fetching contact history:", error);
    res.status(500).json({ error: "Failed to fetch contact history" });
  }
});

// POST /api/contacts/:id/snooze - Snooze reminder
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

    const { hours } = req.body;
    let contact;

    if (hours === "tomorrow") {
      contact = await contactService.snoozeUntilTomorrow(contactId);
    } else {
      const snoozeHours = parseInt(hours) || 1;
      if (snoozeHours < 1 || snoozeHours > 24) {
        res.status(400).json({ error: "Invalid snooze duration" });
        return;
      }
      contact = await contactService.snooze(contactId, snoozeHours);
    }

    res.json({ contact: contact ? computeContactStatus(contact) : null });
  } catch (error) {
    console.error("Error snoozing contact:", error);
    res.status(500).json({ error: "Failed to snooze contact" });
  }
});

export default router;
