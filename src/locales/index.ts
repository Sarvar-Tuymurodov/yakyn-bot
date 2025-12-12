import { ru } from "./ru.js";
import { uz } from "./uz.js";

export type Language = "ru" | "uz";

export const locales = {
  ru,
  uz,
} as const;

export function t(lang: Language, key: keyof typeof ru): string {
  return locales[lang][key] as string;
}

export function formatMessage(
  template: string,
  params: Record<string, string | number>
): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

export { ru, uz };
