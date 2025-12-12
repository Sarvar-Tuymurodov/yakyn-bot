import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";
import { t, Language } from "../../locales/index.js";

const WEBAPP_URL = process.env.WEBAPP_URL || "https://yakyn-app.vercel.app";

export async function actionsCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData?.startsWith("action:")) return;

  const action = callbackData.split(":")[1];
  const telegramId = BigInt(ctx.from!.id);

  const user = await userService.findByTelegramId(telegramId);
  const lang = (user?.language ?? "ru") as Language;

  await ctx.answerCallbackQuery();

  switch (action) {
    case "add_another":
      ctx.session.step = "awaiting_name";
      await ctx.reply(t(lang, "enterName"));
      break;

    case "open_app":
      // For now, just inform user
      // In production, this would use the web_app button
      await ctx.answerCallbackQuery({
        text: "Mini App will be available soon!",
      });
      break;

    default:
      break;
  }
}
