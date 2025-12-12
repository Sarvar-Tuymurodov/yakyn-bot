import { Bot, Context, session, SessionFlavor } from "grammy";
import { Language } from "../locales/index.js";

// Session data interface
interface SessionData {
  step?: "awaiting_name" | "awaiting_frequency" | "awaiting_time";
  contactName?: string;
  contactFrequency?: string;
}

// Custom context type
export type BotContext = Context & SessionFlavor<SessionData>;

// Create bot instance
export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Session middleware
  bot.use(
    session({
      initial: (): SessionData => ({}),
    })
  );

  return bot;
}

export type { SessionData };
