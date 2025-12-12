import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, Language } from "../../locales/index.js";

export async function addCommand(ctx: BotContext) {
  const telegramId = BigInt(ctx.from!.id);

  // Get user to check language
  const user = await userService.findOrCreate(telegramId, ctx.from?.username);
  const lang = user.language as Language;

  // Set session step
  ctx.session.step = "awaiting_name";

  await ctx.reply(t(lang, "enterName"));
}
