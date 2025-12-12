import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, Language } from "../../locales/index.js";

export async function languageCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("lang:")) return;

  const lang = callbackData.split(":")[1] as Language;
  const telegramId = BigInt(ctx.from!.id);
  const username = ctx.from?.username;

  // Create or update user with selected language
  let user = await userService.findByTelegramId(telegramId);

  if (user) {
    await userService.updateLanguage(telegramId, lang);
  } else {
    user = await userService.create({
      telegramId,
      username,
      language: lang,
    });
  }

  // Answer callback to remove loading state
  await ctx.answerCallbackQuery();

  // Delete the language selection message
  await ctx.deleteMessage();

  // Send welcome message
  await ctx.reply(t(lang, "welcome"));
}
