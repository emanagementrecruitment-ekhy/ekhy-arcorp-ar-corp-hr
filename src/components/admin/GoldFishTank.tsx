// Decorative aquarium for the Pusat Sistem copyright plate: pairs of gold ornamental fish
// that circle each other while the pair itself sways across the glass, plus rising bubbles.
// Pure CSS animation (see ".ar-tank" in globals.css) — no JS timers, and everything holds
// still when the device asks for reduced motion.

const BUBBLES = [
  { left: 7, size: 5, delay: 0, dur: 9 },
  { left: 19, size: 3, delay: 3.2, dur: 7 },
  { left: 33, size: 4, delay: 6.1, dur: 10 },
  { left: 47, size: 3, delay: 1.4, dur: 8 },
  { left: 61, size: 5, delay: 4.6, dur: 11 },
  { left: 74, size: 3, delay: 2.2, dur: 7.5 },
  { left: 86, size: 4, delay: 5.3, dur: 9.5 },
  { left: 95, size: 3, delay: 7.4, dur: 8.5 },
];

// A pair = two fish on opposite sides of a rotating ring. The ring turns, so each fish
// swims along a circle and the two chase each other; the lane sways the whole pair.
const PAIRS = [
  { id: "a", left: 13, top: 30, size: 52, radius: 38, orbit: 9, sway: 14, swayDur: 15, reverse: false },
  { id: "b", left: 87, top: 66, size: 46, radius: 34, orbit: 11, sway: 12, swayDur: 18, reverse: true },
  { id: "c", left: 50, top: 14, size: 34, radius: 24, orbit: 7, sway: 20, swayDur: 21, reverse: false },
];

function Fish({ className }: { className: string }) {
  return (
    <svg className={`ar-fish ${className}`} viewBox="-8 0 74 30" aria-hidden>
      <g className="ar-fish-tail">
        <path d="M9 15 C3 8 -1 5 -5 3 C0 10 0 20 -5 27 C-1 25 3 22 9 15 Z" fill="url(#arFishGold)" opacity="0.92" />
      </g>
      <path d="M22 8 C26 -1 35 0 40 7 Z" fill="url(#arFishGold)" opacity="0.9" />
      <path d="M6 15 C14 4 36 2 50 12 C55 14.4 55 15.6 50 18 C36 28 14 26 6 15 Z" fill="url(#arFishGold)" />
      <path d="M38 18 C34 25 28 26 25 24 C30 22 33 20 38 18 Z" fill="#fff1c0" opacity="0.8" />
      <path d="M14 14 C24 8 34 8 44 12" stroke="#fff6d6" strokeWidth="0.9" fill="none" opacity="0.55" strokeLinecap="round" />
      <circle cx="45" cy="13" r="1.9" fill="#1a1205" />
      <circle cx="45.6" cy="12.4" r="0.6" fill="#fff" />
    </svg>
  );
}

export default function GoldFishTank() {
  return (
    <div className="ar-tank" aria-hidden>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="arFishGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff4c9" />
            <stop offset="38%" stopColor="#f0c75a" />
            <stop offset="72%" stopColor="#d9ab3c" />
            <stop offset="100%" stopColor="#8a6429" />
          </linearGradient>
        </defs>
      </svg>

      <span className="ar-tank-waterline" />
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="ar-bubble"
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }}
        />
      ))}

      {PAIRS.map((p) => (
        <div
          key={p.id}
          className="ar-lane"
          style={{ top: `${p.top}%`, animationDuration: `${p.swayDur}s`, ["--sway" as string]: `${p.sway}%` }}
        >
          <div
            className={`ar-pair${p.reverse ? " ar-pair-rev" : ""}`}
            style={{
              left: `${p.left}%`,
              ["--fw" as string]: `${p.size}px`,
              ["--r" as string]: `${p.radius}px`,
              animationDuration: `${p.orbit}s`,
            }}
          >
            <Fish className="ar-fish-a" />
            <Fish className="ar-fish-b" />
          </div>
        </div>
      ))}
    </div>
  );
}
