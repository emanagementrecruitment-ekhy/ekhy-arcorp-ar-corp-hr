import { usesVcr } from "./constants";

/** The three kasbon groups the office reviews separately. */
export const KASBON_KINDS = ["KARYAWAN", "TERAPIS", "CHANNEL"] as const;
export type KasbonKind = (typeof KASBON_KINDS)[number];

export const KASBON_KIND_LABEL: Record<KasbonKind, string> = {
  KARYAWAN: "Karyawan",
  TERAPIS: "Terapis",
  CHANNEL: "Channel/Link",
};

/**
 * Which group a kasbon belongs to, from the requester's Peran. Channel/Link people have no marker
 * in the data yet (their definition is still being drafted), so nobody lands in CHANNEL for now.
 */
export function kasbonKindFor(role: string): KasbonKind {
  return usesVcr(role) ? "TERAPIS" : "KARYAWAN";
}
