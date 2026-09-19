"use client";

import { useEffect } from "react";
import { LIGHT_MODE_DAY_START_HOUR, LIGHT_MODE_DAY_END_HOUR } from "@/lib/constants";

function computeAutoMode() {
  const hour = new Date().getHours();
  return hour >= LIGHT_MODE_DAY_START_HOUR && hour < LIGHT_MODE_DAY_END_HOUR ? "light" : "dark";
}

/**
 * Keeps [data-mode] correct while "Otomatis" stays open across the
 * light/dark boundary (e.g. a shift left open from afternoon into evening).
 * The very first paint is already handled by the inline beforeInteractive
 * script in layout.tsx — this only re-checks periodically after that, since
 * a mounted React effect runs too late to prevent the initial flash itself.
 */
export default function LightModeSync({ lightMode }: { lightMode: string }) {
  useEffect(() => {
    if (lightMode !== "auto") return;
    const apply = () => document.documentElement.setAttribute("data-mode", computeAutoMode());
    apply();
    const id = setInterval(apply, 5 * 60_000);
    return () => clearInterval(id);
  }, [lightMode]);

  return null;
}
