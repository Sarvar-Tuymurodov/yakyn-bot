import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { contactService } from "../../services/contact.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";

export async function reminderCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("reminder:")) return;

  const parts = callbackData.split(":");
  const action = parts[1];
  const contactId = parseInt(parts[2]);
  const snoozeParam = parts[3]; // For snooze: "1", "3", or "tomorrow"
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
      let message: string;

      if (snoozeParam === "tomorrow") {
        // Snooze until tomorrow
        await contactService.snoozeUntilTomorrow(contactId);
        message = formatMessage(t(lang, "snoozedTomorrow"), {
          time: contact.reminderTime,
        });
      } else {
        // Snooze for specific hours (1 or 3)
        const hours = parseInt(snoozeParam) || 1;
        await contactService.snooze(contactId, hours);
        message = formatMessage(t(lang, "snoozedHours"), {
          hours: hours.toString(),
        });
      }

      await ctx.editMessageText(message);
      break;
    }

    default:
      break;
  }
}
