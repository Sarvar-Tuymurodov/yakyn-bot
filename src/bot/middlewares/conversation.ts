import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, formatMessage, Language } from "../../locales/index.js";
import { createFrequencyKeyboard } from "../callbacks/frequency.js";

export async function handleTextMessage(ctx: BotContext) {
  const text = ctx.message?.text;
  if (!text) return;

  // Ignore commands
  if (text.startsWith("/")) return;

  const telegramId = BigInt(ctx.from!.id);

  // Check if we're waiting for input
  if (ctx.session.step === "awaiting_name") {
    // Get user language
    const user = await userService.findByTelegramId(telegramId);
    const lang = (user?.language ?? "ru") as Language;

    // Store the name
    ctx.session.contactName = text.trim();
    ctx.session.step = "awaiting_frequency";

    // Ask for frequency
    const message = formatMessage(t(lang, "selectFrequency"), {
      name: ctx.session.contactName,
    });

    const keyboard = createFrequencyKeyboard(lang);

    await ctx.reply(message, { reply_markup: keyboard });
  }
}
