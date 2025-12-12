import { InlineKeyboard } from "grammy";
import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { contactService } from "../../services/contact.service.js";
import { t, formatMessage, Language, locales } from "../../locales/index.js";

export async function listCommand(ctx: BotContext) {
  const telegramId = BigInt(ctx.from!.id);

  // Get user
  const user = await userService.findOrCreate(telegramId, ctx.from?.username);
  const lang = user.language as Language;

  // Get contacts
  const contacts = await contactService.findByUserId(user.id);

  if (contacts.length === 0) {
    await ctx.reply(t(lang, "noContacts"));
    return;
  }

  // Count overdue contacts
  const overdue = await contactService.countOverdue(user.id);

  const message = formatMessage(t(lang, "listContacts"), {
    count: contacts.length,
    overdue: overdue,
  });

  const buttons = locales[lang].buttons;
  const keyboard = new InlineKeyboard().text(buttons.openApp, "action:open_app");

  await ctx.reply(message, { reply_markup: keyboard });
}
