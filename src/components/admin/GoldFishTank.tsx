"use client";

import { useEffect, useRef } from "react";

// Decorative aquarium for the Pusat Sistem copyright plate: two big gold koi swim round the
// banner at the same time but in opposite directions (one clockwise, one counter-clockwise),
// so their paths cross as they go. Each fish always points along its path.
//
// Position and heading are computed per frame from the plate's real size, so the loop stays
// correct on every screen width. With "reduce motion" on, the fish rest in place instead.

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

// dir: +1 = clockwise on screen, -1 = counter-clockwise. period = seconds per full lap.
const FISH = [
  { id: "a", dir: 1, period: 19, phase: Math.PI * 0.15, scale: 1, tone: "" },
  { id: "b", dir: -1, period: 23, phase: Math.PI * 1.15, scale: 0.9, tone: " ar-koi-amber" },
] as const;

function Koi({ tone }: { tone: string }) {
  return (
    <svg className={`ar-koi${tone}`} viewBox="-4 -6 206 92" aria-hidden>
      {/* flowing tail */}
      <g className="ar-koi-tail">
        <path d="M64 40 C44 24 24 12 2 6 C13 22 11 31 0 40 C11 49 13 58 2 74 C24 68 44 56 64 40 Z" fill="url(#arKoiFin)" />
        <path d="M64 40 C46 31 30 22 10 14 M64 40 C48 36 30 33 6 30 M64 40 C48 44 30 47 6 50 M64 40 C46 49 30 58 10 66" stroke="#fff3c4" strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />
      </g>
      {/* pectoral fins, top and bottom */}
      <g className="ar-koi-pec ar-koi-pec-t">
        <path d="M134 30 C128 14 114 6 98 2 C104 12 108 22 116 32 Z" fill="url(#arKoiFin)" />
        <path d="M132 30 C122 20 112 12 100 5 M130 31 C122 25 114 20 106 14" stroke="#fff3c4" strokeWidth="0.8" fill="none" opacity="0.55" />
      </g>
      <g className="ar-koi-pec ar-koi-pec-b">
        <path d="M134 50 C128 66 114 74 98 78 C104 68 108 58 116 48 Z" fill="url(#arKoiFin)" />
        <path d="M132 50 C122 60 112 68 100 75 M130 49 C122 55 114 60 106 66" stroke="#fff3c4" strokeWidth="0.8" fill="none" opacity="0.55" />
      </g>
      {/* body: gold gradient, scale pattern, spine and head highlight */}
      <path d="M60 40 C80 22 122 15 160 26 C178 31 186 36 186 40 C186 44 178 49 160 54 C122 65 80 58 60 40 Z" fill="url(#arKoiBody)" />
      <path d="M60 40 C80 22 122 15 160 26 C178 31 186 36 186 40 C186 44 178 49 160 54 C122 65 80 58 60 40 Z" fill="url(#arKoiScales)" />
      <path d="M72 40 C104 38 142 38 178 40" stroke="#8a5a12" strokeWidth="1" fill="none" opacity="0.35" />
      <ellipse cx="166" cy="40" rx="21" ry="10.5" fill="#fff0b0" opacity="0.5" />
      <path d="M100 27 C124 22 150 26 168 32" stroke="#fffbe6" strokeWidth="1.6" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* eyes and barbels */}
      <circle cx="171" cy="31.5" r="2.7" fill="#2a1704" />
      <circle cx="171.8" cy="30.7" r="0.8" fill="#fff" />
      <circle cx="171" cy="48.5" r="2.7" fill="#2a1704" />
      <circle cx="171.8" cy="47.7" r="0.8" fill="#fff" />
      <path d="M185 37 C192 34 196 28 199 21 M185 43 C192 46 196 52 199 59" stroke="#f3d57d" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function GoldFishTank() {
  const tankRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const tank = tankRef.current;
    if (!tank) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    const start = performance.now();
    let last = start;
    const theta = FISH.map((f) => f.phase);

    // elapsed = seconds since mount (drives wobble and fin beat); speed = 0.. (1 = cruising)
    const place = (elapsed: number, speeds: number[]) => {
      const fishW = Math.min(Math.max(width * 0.24, 96), 190);
      const a = Math.max(width / 2 - fishW * 0.42, 40);
      const b = Math.max(height / 2 - fishW * 0.3, 30);
      FISH.forEach((f, i) => {
        const el = fishRefs.current[i];
        if (!el) return;
        const th = theta[i];
        const x = width / 2 + a * Math.cos(th);
        const y = height / 2 + b * Math.sin(th);
        // Heading = direction of travel along the ellipse, plus a little swimming wobble.
        const tx = f.dir * -a * Math.sin(th);
        const ty = f.dir * b * Math.cos(th);
        const heading = (Math.atan2(ty, tx) * 180) / Math.PI + 3.5 * Math.sin(elapsed * 2.6 + i * 2);
        // Slightly larger at the bottom of the loop — a hint of depth.
        const depth = f.scale * (1 + 0.1 * Math.sin(th));
        el.style.width = `${fishW}px`;
        el.style.marginLeft = `${-fishW / 2}px`;
        el.style.marginTop = `${-fishW * 0.2}px`;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${heading.toFixed(1)}deg) scale(${depth.toFixed(3)})`;
        // Fins beat faster when the fish pushes harder and ease off while it glides.
        const beat = elapsed * (3.2 + speeds[i] * 5.5) + i * 1.7;
        el.style.setProperty("--tail", `${(15 * Math.sin(beat)).toFixed(1)}deg`);
        el.style.setProperty("--pec-t", `${(10 * Math.sin(beat * 0.5 + 1)).toFixed(1)}deg`);
        el.style.setProperty("--pec-b", `${(-10 * Math.sin(beat * 0.5 + 1)).toFixed(1)}deg`);
        el.style.opacity = "1";
      });
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const elapsed = (now - start) / 1000;
      // Each fish surges and glides: its speed breathes around the cruising pace.
      const speeds = FISH.map((f, i) => 1 + 0.35 * Math.sin(elapsed * 0.55 + i * 2.4));
      FISH.forEach((f, i) => {
        theta[i] += f.dir * ((Math.PI * 2) / f.period) * speeds[i] * dt;
      });
      place(elapsed, speeds);
      raf = requestAnimationFrame(frame);
    };

    const measure = () => {
      width = tank.clientWidth;
      height = tank.clientHeight;
      place((performance.now() - start) / 1000, FISH.map(() => 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tank);
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="ar-tank" ref={tankRef} aria-hidden>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="arKoiBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff2b8" />
            <stop offset="35%" stopColor="#f2c64f" />
            <stop offset="70%" stopColor="#d9a232" />
            <stop offset="100%" stopColor="#9a6a1c" />
          </linearGradient>
          <linearGradient id="arKoiFin" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#f6d779" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c8932c" stopOpacity="0.5" />
          </linearGradient>
          <pattern id="arKoiScales" width="9" height="9" patternUnits="userSpaceOnUse">
            <path d="M0 9 Q4.5 1 9 9 M-4.5 4.5 Q0 -3.5 4.5 4.5 M4.5 4.5 Q9 -3.5 13.5 4.5" stroke="#7a4a0c" strokeOpacity="0.4" strokeWidth="0.8" fill="none" />
          </pattern>
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

      {FISH.map((f, i) => (
        <div
          key={f.id}
          className="ar-koi-wrap"
          ref={(el) => {
            fishRefs.current[i] = el;
          }}
        >
          <Koi tone={f.tone} />
        </div>
      ))}
    </div>
  );
}
