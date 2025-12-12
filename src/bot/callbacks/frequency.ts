import { InlineKeyboard } from "grammy";
import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";
import { Frequency } from "../../services/contact.service.js";

const TIME_OPTIONS = ["08:00", "09:00", "10:00", "12:00", "14:00", "18:00", "20:00", "21:00", "22:00"];

export async function frequencyCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("freq:")) return;

  const frequency = callbackData.split(":")[1] as Frequency;
  const telegramId = BigInt(ctx.from!.id);

  // Get user language
  const user = await userService.findByTelegramId(telegramId);
  const lang = (user?.language ?? "ru") as Language;

  // Store frequency in session
  ctx.session.contactFrequency = frequency;
  ctx.session.step = "awaiting_time";

  await ctx.answerCallbackQuery();

  // Delete previous message
  await ctx.deleteMessage();

  // Create time selection keyboard
  const keyboard = new InlineKeyboard();
  for (let i = 0; i < TIME_OPTIONS.length; i++) {
    keyboard.text(TIME_OPTIONS[i], `time:${TIME_OPTIONS[i]}`);
    if ((i + 1) % 3 === 0) keyboard.row();
  }

  const message = formatMessage(t(lang, "selectTime"), {
    name: ctx.session.contactName ?? "",
  });

  await ctx.reply(message, { reply_markup: keyboard });
}

export function createFrequencyKeyboard(lang: Language): InlineKeyboard {
  const frequencies = locales[lang].frequencies;

  return new InlineKeyboard()
    .text(frequencies.weekly, "freq:weekly")
    .text(frequencies.biweekly, "freq:biweekly")
    .row()
    .text(frequencies.monthly, "freq:monthly")
    .text(frequencies.quarterly, "freq:quarterly");
}
