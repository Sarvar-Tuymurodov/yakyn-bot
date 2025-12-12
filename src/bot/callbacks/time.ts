import { InlineKeyboard } from "grammy";
import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { contactService, Frequency } from "../../services/contact.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";

export async function timeCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("time:")) return;

  const time = callbackData.split(":").slice(1).join(":"); // Handle "time:09:00"
  const telegramId = BigInt(ctx.from!.id);

  // Get user
  const user = await userService.findByTelegramId(telegramId);
  if (!user) {
    await ctx.answerCallbackQuery({ text: "Please start the bot first with /start" });
    return;
  }

  const lang = user.language as Language;
  const name = ctx.session.contactName;
  const frequency = ctx.session.contactFrequency as Frequency;

  if (!name || !frequency) {
    await ctx.answerCallbackQuery({ text: "Session expired. Please try /add again" });
    return;
  }

  // Create the contact
  const contact = await contactService.create({
    userId: user.id,
    name,
    frequency,
    reminderTime: time,
  });

  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();

  // Format next reminder date
  const nextDate = contact.nextReminderAt.toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ", {
    day: "numeric",
    month: "long",
  });

  const frequencyText = locales[lang].frequencies[frequency];

  const message = formatMessage(t(lang, "contactAdded"), {
    name,
    frequency: frequencyText,
    time,
    date: nextDate,
  });

  const buttons = locales[lang].buttons;
  const keyboard = new InlineKeyboard()
    .text(buttons.addAnother, "action:add_another")
    .text(buttons.openApp, "action:open_app");

  await ctx.reply(message, { reply_markup: keyboard });

  // Clear session
  ctx.session.step = undefined;
  ctx.session.contactName = undefined;
  ctx.session.contactFrequency = undefined;
}
