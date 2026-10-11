// Reads docs/CHANGELOG.md for "Catatan Pembaruan" in Pusat Sistem. Pure parsing here; the file read lives in the API route.

export interface ChangelogItem {
  group: "Baru" | "Diubah" | "Diperbaiki" | "Lainnya";
  text: string;
}

const GROUPS: Record<string, ChangelogItem["group"]> = {
  added: "Baru",
  changed: "Diubah",
  fixed: "Diperbaiki",
};

/** Newest-first bullet list from the top of the changelog (Unreleased first), markdown marks removed. */
export function parseChangelog(text: string, limit = 12): ChangelogItem[] {
  const items: ChangelogItem[] = [];
  let group: ChangelogItem["group"] = "Lainnya";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      group = GROUPS[h3[1].trim().toLowerCase()] ?? "Lainnya";
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      items.push({ group, text: bullet[1].replace(/`/g, "").replace(/\*\*/g, "").trim() });
      if (items.length >= limit) break;
    }
  }
  return items;
}
