import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { ASSISTANT_NAME } from "@/lib/ai-assistant-rules";
// "Angel" — the AR Corp assistant, shown as a round 3D-render portrait (public/angel.webp, 256px).
// The mood only changes the motion: thinking pulses a gold ring, talking bobs gently (.arc-mascot-* in globals.css).

export type MascotMood = "idle" | "thinking" | "talking";

export default function ArMascot({ size = 56, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${ASSISTANT_NAME}, asisten ${BRAND.short}`}
      className={`arc-mascot arc-mascot-${mood} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/angel.webp" alt="" width={256} height={256} unoptimized draggable={false} />
    </span>
  );
}
