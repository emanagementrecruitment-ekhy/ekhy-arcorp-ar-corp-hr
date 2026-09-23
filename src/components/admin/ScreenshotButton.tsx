"use client";

import { useRef, useState } from "react";

/**
 * Lets the admin pick any rectangular area on screen (drag to resize/move it)
 * before capturing just that region as a PNG — "ukuran semau kita" per the
 * admin's own request, rather than a fixed full-page screenshot.
 *
 * Uses Pointer Events (not mouse events) so dragging works on touchscreens —
 * this is opened from an Android phone as often as a desktop browser. The
 * capture itself goes through modern-screenshot rather than html2canvas:
 * html2canvas re-implements CSS parsing from scratch and throws on Tailwind
 * v4's color-mix()-based opacity utilities used throughout this app (e.g.
 * bg-ar-red/25), while modern-screenshot renders via an SVG <foreignObject>
 * so the browser itself does the styling — it handles color-mix/oklch fine.
 *
 * Rendered once from admin/layout.tsx (not per-page) as a fixed-position
 * button so it stays put across every admin menu instead of disappearing
 * when navigating away from whichever page happened to render it.
 */
export default function ScreenshotButton() {
  const [selecting, setSelecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  function startSelecting() {
    setRect(null);
    setSelecting(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const start = dragStart.current;
    setRect({
      x: Math.min(start.x, e.clientX),
      y: Math.min(start.y, e.clientY),
      w: Math.abs(e.clientX - start.x),
      h: Math.abs(e.clientY - start.y),
    });
  }

  async function onPointerUp() {
    const finalRect = dragStart.current ? rect : null;
    dragStart.current = null;
    if (!finalRect || finalRect.w < 10 || finalRect.h < 10) {
      setRect(null);
      return;
    }
    setSelecting(false);
    setBusy(true);
    try {
      const { domToCanvas } = await import("modern-screenshot");
      const fullCanvas = await domToCanvas(document.body, {
        backgroundColor: "#0b0b0c",
      });
      const scaleX = fullCanvas.width / document.body.scrollWidth;
      const scaleY = fullCanvas.height / document.body.scrollHeight;
      const sx = (finalRect.x + window.scrollX) * scaleX;
      const sy = (finalRect.y + window.scrollY) * scaleY;
      const sw = finalRect.w * scaleX;
      const sh = finalRect.h * scaleY;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(sw);
      cropCanvas.height = Math.round(sh);
      const ctx = cropCanvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);

      const link = document.createElement("a");
      link.download = `screenshot-arcorp-${Date.now()}.png`;
      link.href = cropCanvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Gagal mengambil screenshot. Coba lagi.");
    } finally {
      setBusy(false);
      setRect(null);
    }
  }

  function cancelSelecting() {
    dragStart.current = null;
    setSelecting(false);
    setRect(null);
  }

  return (
    <>
      <button
        onClick={startSelecting}
        disabled={busy}
        title="Screenshot area layar"
        aria-label="Screenshot area layar"
        className="fixed bottom-3 left-3 z-[90] w-9 h-9 shrink-0 grid place-items-center bg-ar-surface2 border border-ar-goldline rounded-[8px] text-ar-gold cursor-pointer disabled:opacity-60 shadow-lg"
      >
        {busy ? (
          <span className="text-[9px]">…</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4h6l1.5 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.5L9 4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </button>

      {selecting && (
        <div
          className="fixed inset-0 z-[100] cursor-crosshair"
          style={{ background: "rgba(0,0,0,0.35)", touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 py-2 px-4 bg-ar-surface border border-ar-goldline rounded-full text-[11.5px] text-ar-gold2 flex items-center gap-3">
            <span>Geser untuk pilih area, lepas untuk screenshot</span>
            <button onClick={cancelSelecting} className="text-ar-dim underline cursor-pointer">
              Batal
            </button>
          </div>
          {rect && (
            <div
              className="absolute border-2 border-ar-gold pointer-events-none"
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: "rgba(200,202,209,0.15)" }}
            />
          )}
        </div>
      )}
    </>
  );
}
