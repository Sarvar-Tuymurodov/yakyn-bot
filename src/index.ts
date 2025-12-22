import "dotenv/config";
import { webhookCallback } from "grammy";
import { createBot } from "./bot/index.js";
import { startCommand } from "./bot/commands/start.js";
import { reminderCallback, handleNoteReply } from "./bot/callbacks/reminder.js";
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

  // Register callback handlers
  bot.callbackQuery(/^reminder:/, reminderCallback);

  // Register text message handler for note replies
  bot.on("message:text", async (ctx) => {
    // Check if this is a note reply
    const handled = await handleNoteReply(ctx);
    if (handled) return;
    // Other text messages can be handled here if needed
  });

  // Error handler
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // Set bot commands for menu (minimal)
  await bot.api.setMyCommands([
    { command: "start", description: "Начать / Boshlash" },
  ]);

  // Set menu button to open Mini App directly (only in production - Telegram requires HTTPS)
  const WEBAPP_URL = process.env.WEBAPP_URL || "https://yakyn.xda.uz";
  if (IS_PRODUCTION) {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Открыть / Ochish",
        web_app: { url: WEBAPP_URL },
      },
    });
  }

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
