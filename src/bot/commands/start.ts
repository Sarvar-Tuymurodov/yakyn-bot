import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";

export async function startCommand(ctx: BotContext) {
  const telegramId = BigInt(ctx.from!.id);
  const username = ctx.from?.username;

  // Ensure user exists in database (will be created with defaults if not)
  await userService.findOrCreate(telegramId, username);

  // Simple welcome message pointing to menu button
  const message = `👋 Yakyn'ga xush kelibsiz!

Ilovani ochish uchun pastdagi "Открыть / Ochish" tugmasini bosing 👇

—

👋 Добро пожаловать в Yakyn!

Нажмите кнопку "Открыть / Ochish" внизу, чтобы открыть приложение 👇`;

  await ctx.reply(message);
}
