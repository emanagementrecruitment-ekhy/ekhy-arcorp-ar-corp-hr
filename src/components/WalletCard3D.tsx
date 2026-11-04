"use client";

import { useRef, useState } from "react";

// CSS-3D render of the upcoming e-wallet card. Drag/touch to rotate; it also sways gently on its own.
export default function WalletCard3D({ label }: { label: string }) {
  const [rot, setRot] = useState({ x: -8, y: 18 });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  return (
    <div
      className="grid place-items-center py-6 select-none touch-none"
      style={{ perspective: 900 }}
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y };
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        setRot({ x: Math.max(-40, Math.min(40, s.rx - (e.clientY - s.y) / 3)), y: s.ry + (e.clientX - s.x) / 3 });
      }}
      onPointerUp={() => {
        start.current = null;
        setDragging(false);
      }}
    >
      <div
        className={dragging ? "" : "ar-wallet-sway"}
        style={{
          width: 280,
          height: 176,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging ? "none" : "transform .5s ease",
        }}
        aria-label="Render 3D kartu dompet digital"
      >
        {/* thickness layers give the card real depth */}
        {[-6, -4, -2].map((z) => (
          <div key={z} className="absolute inset-0 rounded-2xl" style={{ background: "#7a5d1c", transform: `translateZ(${z}px)` }} />
        ))}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
          style={{
            transform: "translateZ(0)",
            background: "linear-gradient(135deg,#1b1608 0%,#3a2d0c 45%,#b98a2a 100%)",
            border: "1px solid rgba(241,210,122,.55)",
            boxShadow: "0 24px 48px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25)",
            color: "#f4e6b8",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-iso text-[18px]">{label} Wallet</span>
            <span className="w-9 h-7 rounded-md" style={{ background: "linear-gradient(135deg,#f1d27a,#b98a2a)" }} aria-hidden />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase opacity-70">Saldo</div>
            <div className="font-unique text-[22px] tracking-[0.12em]">Rp •••••••</div>
          </div>
          <div className="text-[9.5px] tracking-[0.3em] uppercase opacity-70">Segera hadir</div>
        </div>
      </div>
    </div>
  );
}
