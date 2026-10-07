/**
 * Shared class strings for the AR Corp design system's most repeated patterns.
 * Append layout-only classes (width, margin, padding overrides) at the call site.
 */

/** Text input / textarea on an ar-surface card. */
export const inputClass =
  "w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]";

/** Standard card, 20px padding. */
export const cardClass = "p-5 bg-ar-surface border border-ar-line rounded-2xl";

/** Compact card, 18px padding. */
export const cardCompactClass = "p-4.5 bg-ar-surface border border-ar-line rounded-2xl";

/** Primary gold-enamel button. Add padding (py-/px-) and width at the call site. */
export const btnPrimaryClass =
  "ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60";
