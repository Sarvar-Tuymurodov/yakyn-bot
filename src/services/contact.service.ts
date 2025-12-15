import prisma from "../lib/prisma.js";

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly";

const FREQUENCY_DAYS: Record<Frequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
};

export interface CreateContactInput {
  userId: number;
  name: string;
  frequency: Frequency;
  reminderTime: string;
  notes?: string;
  birthday?: Date;
}

export interface UpdateContactInput {
  name?: string;
  frequency?: Frequency;
  reminderTime?: string;
  notes?: string | null;
  birthday?: Date | null;
}

function calculateNextReminder(frequency: Frequency, reminderTime: string): Date {
  const days = FREQUENCY_DAYS[frequency];
  const [hours, minutes] = reminderTime.split(":").map(Number);

  const nextReminder = new Date();
  nextReminder.setDate(nextReminder.getDate() + days);
  nextReminder.setHours(hours, minutes, 0, 0);

  return nextReminder;
}

export const contactService = {
  async findByUserId(userId: number) {
    return prisma.contact.findMany({
      where: { userId },
      orderBy: { nextReminderAt: "asc" },
    });
  },

  async findById(id: number) {
    return prisma.contact.findUnique({
      where: { id },
    });
  },

  async create(data: CreateContactInput) {
    const nextReminderAt = calculateNextReminder(data.frequency, data.reminderTime);

    return prisma.contact.create({
      data: {
        userId: data.userId,
        name: data.name,
        frequency: data.frequency,
        reminderTime: data.reminderTime,
        notes: data.notes,
        birthday: data.birthday,
        nextReminderAt,
      },
    });
  },

  async update(id: number, data: UpdateContactInput) {
    const contact = await this.findById(id);
    if (!contact) return null;

    const frequency = (data.frequency ?? contact.frequency) as Frequency;
    const reminderTime = data.reminderTime ?? contact.reminderTime;

    // Recalculate next reminder if frequency or time changed
    let nextReminderAt = contact.nextReminderAt;
    if (data.frequency || data.reminderTime) {
      nextReminderAt = calculateNextReminder(frequency, reminderTime);
    }

    return prisma.contact.update({
      where: { id },
      data: {
        ...data,
        nextReminderAt,
      },
    });
  },

  async delete(id: number) {
    return prisma.contact.delete({
      where: { id },
    });
  },

  async markContacted(id: number) {
    const contact = await this.findById(id);
    if (!contact) return null;

    const frequency = contact.frequency as Frequency;
    const nextReminderAt = calculateNextReminder(frequency, contact.reminderTime);

    // Create history entry
    await prisma.contactHistory.create({
      data: {
        contactId: id,
        userId: contact.userId,
        eventType: "contacted",
      },
    });

    return prisma.contact.update({
      where: { id },
      data: {
        lastContactAt: new Date(),
        nextReminderAt,
        snoozedUntil: null,
      },
    });
  },

  async snooze(id: number, hours: number) {
    const snoozedUntil = new Date();
    snoozedUntil.setHours(snoozedUntil.getHours() + hours);

    return prisma.contact.update({
      where: { id },
      data: { snoozedUntil },
    });
  },

  async snoozeUntilTomorrow(id: number) {
    const contact = await this.findById(id);
    if (!contact) return null;

    const [hours, minutes] = contact.reminderTime.split(":").map(Number);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);

    return prisma.contact.update({
      where: { id },
      data: {
        snoozedUntil: tomorrow,
      },
    });
  },

  async findDueReminders() {
    const now = new Date();

    return prisma.contact.findMany({
      where: {
        OR: [
          {
            nextReminderAt: { lte: now },
            snoozedUntil: null,
          },
          {
            snoozedUntil: { lte: now },
          },
        ],
      },
      include: {
        user: true,
      },
      orderBy: { nextReminderAt: "asc" },
    });
  },

  async countOverdue(userId: number) {
    const now = new Date();

    return prisma.contact.count({
      where: {
        userId,
        nextReminderAt: { lte: now },
        snoozedUntil: null,
      },
    });
  },

  async getHistory(contactId: number, limit = 20) {
    return prisma.contactHistory.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};

export { FREQUENCY_DAYS };
