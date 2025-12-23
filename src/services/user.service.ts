import prisma from "../lib/prisma.js";
import { Language } from "../locales/index.js";

export interface CreateUserInput {
  telegramId: bigint;
  username?: string;
  language?: Language;
}

export interface UpdateUserInput {
  language?: Language;
  timezone?: string;
}

export const userService = {
  async findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  },

  async create(data: CreateUserInput) {
    return prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username,
        language: data.language ?? "ru",
      },
    });
  },

  async findOrCreate(telegramId: bigint, username?: string) {
    // Use upsert to avoid race condition when multiple requests come in simultaneously
    return prisma.user.upsert({
      where: { telegramId },
      update: {}, // Don't update anything if user exists
      create: {
        telegramId,
        username,
        language: "ru",
      },
    });
  },

  async updateLanguage(telegramId: bigint, language: Language) {
    return prisma.user.update({
      where: { telegramId },
      data: { language },
    });
  },

  async updateTimezone(telegramId: bigint, timezone: string) {
    return prisma.user.update({
      where: { telegramId },
      data: { timezone },
    });
  },

  async update(telegramId: bigint, data: UpdateUserInput) {
    return prisma.user.update({
      where: { telegramId },
      data,
    });
  },
};
