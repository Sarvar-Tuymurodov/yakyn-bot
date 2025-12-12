import { InlineKeyboard } from "grammy";
import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, Language } from "../../locales/index.js";

export async function startCommand(ctx: BotContext) {
  const telegramId = BigInt(ctx.from!.id);
  const username = ctx.from?.username;

  // Check if user exists
  const existingUser = await userService.findByTelegramId(telegramId);

  if (existingUser) {
    // User already exists, show welcome message in their language
    const lang = existingUser.language as Language;
    await ctx.reply(t(lang, "welcome"));
    return;
  }

  // New user - show language selection
  const keyboard = new InlineKeyboard()
    .text("🇺🇿 O'zbekcha", "lang:uz")
    .text("🇷🇺 Русский", "lang:ru");

  await ctx.reply(t("ru", "selectLanguage"), {
    reply_markup: keyboard,
  });
}
