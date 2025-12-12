import "dotenv/config";
import { webhookCallback } from "grammy";
import { createBot } from "./bot/index.js";
import { startCommand } from "./bot/commands/start.js";
import { addCommand } from "./bot/commands/add.js";
import { listCommand } from "./bot/commands/list.js";
import { languageCallback } from "./bot/callbacks/language.js";
import { frequencyCallback } from "./bot/callbacks/frequency.js";
import { timeCallback } from "./bot/callbacks/time.js";
import { actionsCallback } from "./bot/callbacks/actions.js";
import { reminderCallback } from "./bot/callbacks/reminder.js";
import { handleTextMessage } from "./bot/middlewares/conversation.js";
import { startReminderScheduler } from "./scheduler/reminders.js";
import app from "./app.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is required in environment variables");
  process.exit(1);
}

async function main() {
  // Create bot
  const bot = createBot(BOT_TOKEN!);

  // Register commands
  bot.command("start", startCommand);
  bot.command("add", addCommand);
  bot.command("list", listCommand);

  // Register callback handlers
  bot.callbackQuery(/^lang:/, languageCallback);
  bot.callbackQuery(/^freq:/, frequencyCallback);
  bot.callbackQuery(/^time:/, timeCallback);
  bot.callbackQuery(/^action:/, actionsCallback);
  bot.callbackQuery(/^reminder:/, reminderCallback);

  // Handle text messages (for conversation flow)
  bot.on("message:text", handleTextMessage);

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // Set bot commands for menu
  await bot.api.setMyCommands([
    { command: "start", description: "Начать / Boshlash" },
    { command: "add", description: "Добавить контакт / Kontakt qo'shish" },
    { command: "list", description: "Мои контакты / Kontaktlarim" },
  ]);

  if (IS_PRODUCTION && WEBHOOK_URL) {
    // Production: Use webhook
    console.log("🌐 Running in production mode with webhook");

    // Set webhook
    await bot.api.setWebhook(`${WEBHOOK_URL}/webhook`);

    // Add webhook route
    app.use("/webhook", webhookCallback(bot, "express"));

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Webhook set to ${WEBHOOK_URL}/webhook`);
    });
  } else {
    // Development: Use long polling
    console.log("🔧 Running in development mode with long polling");

    // Delete any existing webhook
    await bot.api.deleteWebhook();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Start bot (long polling)
    console.log("🤖 Starting bot...");
    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} is running!`);
      },
    });
  }

  // Start reminder scheduler (both modes)
  startReminderScheduler(bot);
}

main().catch(console.error);
