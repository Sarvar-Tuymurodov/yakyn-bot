import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { contactService } from "../../services/contact.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";

export async function reminderCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("reminder:")) return;

  const [, action, contactIdStr] = callbackData.split(":");
  const contactId = parseInt(contactIdStr);
  const telegramId = BigInt(ctx.from!.id);

  // Get user for language
  const user = await userService.findByTelegramId(telegramId);
  const lang = (user?.language ?? "ru") as Language;

  // Verify contact belongs to user
  const contact = await contactService.findById(contactId);
  if (!contact || contact.userId !== user?.id) {
    await ctx.answerCallbackQuery({ text: "Contact not found" });
    return;
  }

  await ctx.answerCallbackQuery();

  switch (action) {
    case "contacted": {
      // Mark as contacted
      const updated = await contactService.markContacted(contactId);

      const nextDate = updated?.nextReminderAt.toLocaleDateString(
        lang === "ru" ? "ru-RU" : "uz-UZ",
        { day: "numeric", month: "long" }
      );

      const message = formatMessage(t(lang, "markedContacted"), {
        date: nextDate ?? "",
      });

      await ctx.editMessageText(message);
      break;
    }

    case "snooze": {
      // Snooze until tomorrow
      const updated = await contactService.snoozeUntilTomorrow(contactId);

      const message = formatMessage(t(lang, "snoozedTomorrow"), {
        time: contact.reminderTime,
      });

      await ctx.editMessageText(message);
      break;
    }

    default:
      break;
  }
}
