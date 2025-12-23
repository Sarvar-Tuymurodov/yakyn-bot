import { BotContext } from "../index.js";
import { InlineKeyboard } from "grammy";
import { userService } from "../../services/user.service.js";
import { contactService } from "../../services/contact.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";
import { analyticsService } from "../../services/analytics.service.js";

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

  // Track reminder clicked analytics
  if (user) {
    analyticsService.track({
      userId: user.id,
      event: "reminder_clicked",
      metadata: { contactId, action },
    });
  }

  switch (action) {
    case "contacted": {
      // Show note prompt with Skip/Add Note buttons
      const askMessage = formatMessage(t(lang, "askForNote"), {
        name: contact.name,
      });

      const keyboard = new InlineKeyboard()
        .text(locales[lang].buttons.addNote, `reminder:addnote:${contactId}`)
        .text(locales[lang].buttons.skip, `reminder:skipnote:${contactId}`);

      await ctx.editMessageText(askMessage, {
        reply_markup: keyboard,
      });
      break;
    }

    case "skipnote": {
      // Mark as contacted without note
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

    case "addnote": {
      // Ask user to type a note
      const askMessage = formatMessage(t(lang, "askForNote"), {
        name: contact.name,
      });

      // Edit the message to remove buttons
      await ctx.editMessageText(askMessage);

      // Send a new message with force_reply to get the note
      // Include contact ID in the message so we can parse it in the reply handler
      const promptMessage = lang === "ru"
        ? `Напишите заметку о разговоре:\n[#yakyn_note_${contactId}]`
        : `Suhbat haqida eslatma yozing:\n[#yakyn_note_${contactId}]`;

      await ctx.reply(promptMessage, {
        reply_markup: {
          force_reply: true,
          selective: true,
          input_field_placeholder: lang === "ru"
            ? "О чём поговорили..."
            : "Nima haqida gaplashdingiz...",
        },
      });
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

// Handler for note text replies
export async function handleNoteReply(ctx: BotContext) {
  // Only process text messages that are replies
  if (!ctx.message?.text || !ctx.message.reply_to_message) return false;

  const replyToText = ctx.message.reply_to_message.text || "";

  // Check if this is a reply to our note prompt and extract contact ID
  const noteMatch = replyToText.match(/\[#yakyn_note_(\d+)\]/);
  if (!noteMatch) return false;

  const contactId = parseInt(noteMatch[1]);
  const telegramId = BigInt(ctx.from!.id);
  const noteText = ctx.message.text.trim();

  // Get user
  const user = await userService.findByTelegramId(telegramId);
  if (!user) return false;
  const lang = (user.language ?? "ru") as Language;

  // Verify contact belongs to user
  const contact = await contactService.findById(contactId);
  if (!contact || contact.userId !== user.id) {
    await ctx.reply(t(lang, "error"));
    return true;
  }

  // Mark as contacted with note
  const updated = await contactService.markContacted(contactId, noteText);

  const nextDate = updated?.nextReminderAt.toLocaleDateString(
    lang === "ru" ? "ru-RU" : "uz-UZ",
    { day: "numeric", month: "long" }
  );

  const message = `${t(lang, "noteReceived")}\n\n${formatMessage(t(lang, "markedContacted"), {
    date: nextDate ?? "",
  })}`;

  await ctx.reply(message);
  return true;
}
