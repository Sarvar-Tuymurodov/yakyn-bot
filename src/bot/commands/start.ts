import { BotContext } from "../index.js";
import { userService } from "../../services/user.service.js";

export async function startCommand(ctx: BotContext) {
  const telegramId = BigInt(ctx.from!.id);
  const username = ctx.from?.username;

  // Ensure user exists in database (will be created with defaults if not)
  await userService.findOrCreate(telegramId, username);

  // Welcome message with app description
  const message = `👋 Yakyn'ga xush kelibsiz!

Yakyn — yaqinlaringiz bilan aloqani yo'qotmaslik uchun eslatmalar ilovasi.

✨ Imkoniyatlar:
• Kontaktlarni ovoz orqali qo'shish
• AI yordamida xabar taklifi
• Tug'ilgan kunlarni eslatish

Boshlash uchun pastdagi tugmani bosing 👇

—

👋 Добро пожаловать в Yakyn!

Yakyn — приложение напоминаний, чтобы не терять связь с близкими.

✨ Возможности:
• Добавление контактов голосом
• AI-подсказки для сообщений
• Напоминания о днях рождения

Нажмите кнопку внизу, чтобы начать 👇`;

  await ctx.reply(message);
}
