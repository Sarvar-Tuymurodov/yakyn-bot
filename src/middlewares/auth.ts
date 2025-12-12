import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { userService } from "../services/user.service.js";

export interface AuthenticatedRequest extends Request {
  telegramUser?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  };
  dbUser?: {
    id: number;
    telegramId: bigint;
    language: string;
    timezone: string;
  };
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");

  if (!hash) return false;

  // Remove hash from params and sort
  urlParams.delete("hash");
  const entries = Array.from(urlParams.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");

  // Create secret key
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();

  // Calculate hash
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return calculatedHash === hash;
}

function parseInitData(initData: string): AuthenticatedRequest["telegramUser"] | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get("user");

    if (!userParam) return null;

    const user = JSON.parse(userParam);
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      languageCode: user.language_code,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("tma ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const initData = authHeader.slice(4); // Remove "tma " prefix
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  // Validate initData
  const isValid = validateTelegramInitData(initData, botToken);

  if (!isValid) {
    res.status(401).json({ error: "Invalid initData" });
    return;
  }

  // Parse user from initData
  const telegramUser = parseInitData(initData);

  if (!telegramUser) {
    res.status(401).json({ error: "Could not parse user from initData" });
    return;
  }

  req.telegramUser = telegramUser;

  // Get or create user in database
  const dbUser = await userService.findOrCreate(BigInt(telegramUser.id), telegramUser.username);

  req.dbUser = {
    id: dbUser.id,
    telegramId: dbUser.telegramId,
    language: dbUser.language,
    timezone: dbUser.timezone,
  };

  next();
}

// Development middleware that bypasses auth (for testing)
export async function devAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // In development, allow passing telegramId via header for testing
  const telegramId = req.headers["x-telegram-id"];

  if (process.env.NODE_ENV === "development" && telegramId) {
    const dbUser = await userService.findByTelegramId(BigInt(telegramId as string));

    if (dbUser) {
      req.telegramUser = { id: Number(telegramId) };
      req.dbUser = {
        id: dbUser.id,
        telegramId: dbUser.telegramId,
        language: dbUser.language,
        timezone: dbUser.timezone,
      };
      next();
      return;
    }
  }

  // Fall back to normal auth
  return authMiddleware(req, res, next);
}
