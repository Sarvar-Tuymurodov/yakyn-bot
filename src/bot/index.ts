import { Bot, Context } from "grammy";

// Custom context type (simplified - no session needed)
export type BotContext = Context;

// Create bot instance
export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);
  return bot;
}
