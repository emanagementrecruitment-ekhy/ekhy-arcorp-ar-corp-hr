"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

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
 * Rendered from AdminSidebar next to the Segarkan and Notifikasi buttons, so it stays
 * put across every admin menu instead of disappearing when navigating away.
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
      // Fill with the current theme's real page color (Siang is light, Malam is dark) instead of a fixed
      // dark one, otherwise a Day-mode capture comes out with a night background.
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--ar-bg").trim();
      const isLight = document.documentElement.getAttribute("data-mode") === "light";
      const fullCanvas = await domToCanvas(document.body, {
        backgroundColor: bg || (isLight ? "#f3f2ef" : "#0b0b0c"),
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
        className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-ar-surface2 border border-ar-line text-ar-dim cursor-pointer transition-colors hover:text-ar-text active:scale-95 disabled:opacity-60"
      >
        {busy ? <span className="text-[10px]">…</span> : <Icon name="scan" className="w-[19px] h-[19px]" />}
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
