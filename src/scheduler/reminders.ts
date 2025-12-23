import cron from "node-cron";
import { Bot } from "grammy";
import prisma from "../lib/prisma.js";
import { t, formatMessage, Language, locales } from "../locales/index.js";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../bot/index.js";
import { analyticsService } from "../services/analytics.service.js";

interface BirthdayContact {
  id: number;
  name: string;
  birthday: Date;
  birthdayReminderSentYear: number | null;
  birthdayWishSentYear: number | null;
  user: {
    telegramId: bigint;
    language: string;
  };
}

interface DueReminder {
  id: number;
  name: string;
  userId: number;
  reminderTime: string;
  nextReminderAt: Date;
  snoozedUntil: Date | null;
  user: {
    telegramId: bigint;
    language: string;
  };
}

function getDaysAgo(date: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function startReminderScheduler(bot: Bot<BotContext>) {
  // Run every minute to check for due reminders
  cron.schedule("* * * * *", async () => {
    try {
      await processReminders(bot);
    } catch (error) {
      console.error("Reminder scheduler error:", error);
    }
  });

  // Run once per day at 09:00 to check for birthdays
  cron.schedule("0 9 * * *", async () => {
    try {
      await processBirthdayReminders(bot);
    } catch (error) {
      console.error("Birthday reminder scheduler error:", error);
    }
  });
}

async function processReminders(bot: Bot<BotContext>) {
  const now = new Date();

  // Find all due reminders
  const dueReminders = await prisma.contact.findMany({
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
      user: {
        select: {
          telegramId: true,
          language: true,
        },
      },
    },
  });

  if (dueReminders.length === 0) return;

  // Group reminders by user
  const remindersByUser = new Map<number, DueReminder[]>();

  for (const reminder of dueReminders) {
    const userId = reminder.userId;
    if (!remindersByUser.has(userId)) {
      remindersByUser.set(userId, []);
    }
    remindersByUser.get(userId)!.push(reminder as DueReminder);
  }

  // Send notifications for each user
  for (const [userId, userReminders] of remindersByUser) {
    try {
      await sendReminderNotification(bot, userReminders);
    } catch (error) {
      console.error(`Failed to send reminder to user ${userId}:`, error);
    }
  }
}

async function sendReminderNotification(
  bot: Bot<BotContext>,
  reminders: DueReminder[]
) {
  const user = reminders[0].user;
  const lang = user.language as Language;
  const telegramId = Number(user.telegramId);

  // Build contacts list
  const contactsList = reminders
    .map((r) => {
      const daysAgo = getDaysAgo(r.nextReminderAt);
      return formatMessage(locales[lang].reminderItem, {
        name: r.name,
        days: daysAgo,
      });
    })
    .join("\n");

  const message = formatMessage(t(lang, "reminder"), {
    contacts: contactsList,
  });

  // Create inline keyboard with actions
  const keyboard = new InlineKeyboard();

  // Add button to open Mini App
  keyboard.text(locales[lang].buttons.openApp, "action:open_app");

  // If single contact, add quick action buttons
  if (reminders.length === 1) {
    const contactId = reminders[0].id;
    keyboard.row();
    keyboard.text(
      locales[lang].buttons.contacted,
      `reminder:contacted:${contactId}`
    );
    keyboard.row();
    keyboard.text(
      locales[lang].buttons.snooze1h,
      `reminder:snooze:${contactId}:1`
    );
    keyboard.text(
      locales[lang].buttons.snooze3h,
      `reminder:snooze:${contactId}:3`
    );
    keyboard.text(
      locales[lang].buttons.tomorrow,
      `reminder:snooze:${contactId}:tomorrow`
    );
  }

  try {
    await bot.api.sendMessage(telegramId, message, {
      reply_markup: keyboard,
    });

    // Track analytics for each reminder sent
    for (const reminder of reminders) {
      analyticsService.track({
        userId: reminder.userId,
        event: "reminder_sent",
        metadata: { contactId: reminder.id },
      });
    }

    // Mark reminders as notified by updating nextReminderAt to far future
    // (they will be reset when user marks as contacted or snoozes)
    const reminderIds = reminders.map((r) => r.id);
    await prisma.contact.updateMany({
      where: { id: { in: reminderIds } },
      data: {
        // Set nextReminderAt to far future to prevent re-notification
        // until user takes action
        nextReminderAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.error(`Failed to send message to ${telegramId}:`, error);
  }
}

function getDaysUntilBirthday(birthday: Date): number {
  const now = new Date();
  const thisYear = now.getFullYear();

  // Set times to midnight for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthdayThisYear = new Date(thisYear, birthday.getMonth(), birthday.getDate());

  // If birthday has passed this year, check next year
  if (birthdayThisYear < today) {
    birthdayThisYear.setFullYear(thisYear + 1);
  }

  const diffTime = birthdayThisYear.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

async function processBirthdayReminders(bot: Bot<BotContext>) {
  const currentYear = new Date().getFullYear();

  // Find all contacts with birthdays
  const contactsWithBirthdays = await prisma.contact.findMany({
    where: {
      birthday: { not: null },
    },
    include: {
      user: {
        select: {
          telegramId: true,
          language: true,
        },
      },
    },
  });

  for (const contact of contactsWithBirthdays as BirthdayContact[]) {
    const daysUntil = getDaysUntilBirthday(contact.birthday);
    const lang = contact.user.language as Language;
    const telegramId = Number(contact.user.telegramId);

    try {
      // Birthday is today
      if (daysUntil === 0 && contact.birthdayWishSentYear !== currentYear) {
        const message = formatMessage(t(lang, "birthdayToday"), {
          name: contact.name,
        });

        const keyboard = new InlineKeyboard();
        keyboard.text("📱 Открыть Yakyn", "action:open_app");

        await bot.api.sendMessage(telegramId, message, {
          reply_markup: keyboard,
        });

        // Mark birthday wish as sent for this year
        await prisma.contact.update({
          where: { id: contact.id },
          data: { birthdayWishSentYear: currentYear },
        });
      }
      // Birthday is in 3 days
      else if (daysUntil === 3 && contact.birthdayReminderSentYear !== currentYear) {
        const message = formatMessage(t(lang, "birthdayReminder"), {
          name: contact.name,
          days: daysUntil,
        });

        const keyboard = new InlineKeyboard();
        keyboard.text("📱 Открыть Yakyn", "action:open_app");

        await bot.api.sendMessage(telegramId, message, {
          reply_markup: keyboard,
        });

        // Mark birthday reminder as sent for this year
        await prisma.contact.update({
          where: { id: contact.id },
          data: { birthdayReminderSentYear: currentYear },
        });
      }
    } catch (error) {
      console.error(`Failed to send birthday reminder for contact ${contact.id}:`, error);
    }
  }
}
