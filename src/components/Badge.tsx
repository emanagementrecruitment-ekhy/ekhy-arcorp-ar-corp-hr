const POSITIVE = new Set(["Disetujui", "Dicairkan", "Dalam radius", "Tervalidasi"]);
const NEGATIVE = new Set(["Ditolak", "Luar radius"]);

export default function Badge({ status }: { status: string }) {
  const tone = POSITIVE.has(status) ? "positive" : NEGATIVE.has(status) ? "negative" : "neutral";
  const cls =
    tone === "positive"
      ? "text-ar-green bg-[rgba(127,209,168,.12)] border-[rgba(127,209,168,.3)]"
      : tone === "negative"
        ? "text-ar-red bg-[rgba(228,117,107,.12)] border-[rgba(228,117,107,.32)]"
        : "text-ar-gold bg-ar-goldfill border-ar-goldline";

  return (
    <span className={`inline-block py-1 px-2.5 rounded-full text-[9.5px] tracking-[0.12em] uppercase whitespace-nowrap border ${cls}`}>
      {status}
    </span>
  );
}
