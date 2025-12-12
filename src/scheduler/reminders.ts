import cron from "node-cron";
import { Bot } from "grammy";
import prisma from "../lib/prisma.js";
import { t, formatMessage, Language, locales } from "../locales/index.js";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../bot/index.js";

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

  console.log("⏰ Reminder scheduler started");
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
    keyboard.row();
    keyboard.text(
      locales[lang].buttons.contacted,
      `reminder:contacted:${reminders[0].id}`
    );
    keyboard.text(
      locales[lang].buttons.tomorrow,
      `reminder:snooze:${reminders[0].id}`
    );
  }

  try {
    await bot.api.sendMessage(telegramId, message, {
      reply_markup: keyboard,
    });

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
