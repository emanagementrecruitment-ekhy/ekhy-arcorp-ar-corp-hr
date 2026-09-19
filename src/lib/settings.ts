import "server-only";
import { prisma } from "./prisma";
import {
  THEME_COLOR_IDS,
  THEME_FONT_IDS,
  LIGHT_MODE_IDS,
  LOGO_LOCK_DAYS,
  type ThemeColorId,
  type ThemeFontId,
  type LightModeId,
} from "./constants";

export const SETTING_ID = "singleton";

export interface AppearanceSetting {
  themeColor: ThemeColorId;
  themeFont: ThemeFontId;
  lightMode: LightModeId;
  logoDataUrl: string | null;
  logoUpdatedAt: Date | null;
}

/** No row yet just means every value is still the shipped default — no need to write one until something actually changes. */
export async function getAppearanceSetting(): Promise<AppearanceSetting> {
  const row = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  const themeColor = THEME_COLOR_IDS.includes(row?.themeColor as ThemeColorId) ? (row!.themeColor as ThemeColorId) : "classic";
  const themeFont = THEME_FONT_IDS.includes(row?.themeFont as ThemeFontId) ? (row!.themeFont as ThemeFontId) : "classic";
  const lightMode = LIGHT_MODE_IDS.includes(row?.lightMode as LightModeId) ? (row!.lightMode as LightModeId) : "auto";
  return {
    themeColor,
    themeFont,
    lightMode,
    logoDataUrl: row?.logoDataUrl ?? null,
    logoUpdatedAt: row?.logoUpdatedAt ?? null,
  };
}

export function logoUnlockDate(logoUpdatedAt: Date | null): Date | null {
  if (!logoUpdatedAt) return null;
  return new Date(logoUpdatedAt.getTime() + LOGO_LOCK_DAYS * 864e5);
}

export function isLogoLocked(logoUpdatedAt: Date | null): boolean {
  const unlockAt = logoUnlockDate(logoUpdatedAt);
  return unlockAt !== null && unlockAt.getTime() > Date.now();
}
