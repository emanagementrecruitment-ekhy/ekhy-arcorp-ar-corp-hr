"use client";

import { useEffect, useRef, useState } from "react";
import GoldFishTank from "@/components/admin/GoldFishTank";

// Pusat Sistem copyright plate, "koi + yin-yang" version.
// Two gold koi (a photo-like texture, sliced along the body and bent along a swimming spine) circle the
// banner calmly, and every so often curl into a yin-yang on the right side of the plate. Droplets leave
// the tails and ripples spread when the yin-yang forms. If the texture cannot load, the older vector
// aquarium (GoldFishTank) is shown instead. With "reduce motion" on, one still yin-yang frame is drawn.
//
// NOTE: in the texture image the HEAD is on the right and the TAIL on the left.

const TEX_SRC = "/koi-tekstur.png";
const TEX_W = 840;
const TEX_H = 351;
// Vertical centre of each of the N-1 vertical slices of the texture (tail slice first), in texture pixels.
const TEX_YC = [175.0, 171.8, 168.2, 168, 170.3, 172.7, 174.6, 175.4, 175.2, 174.2, 174.2, 175.4, 175.3, 174.4, 174.3, 172.8, 170.8, 171.8, 173.6, 174.7, 175.0, 175.2, 175.9, 176.3, 176.6, 176.6, 176.3, 176.3, 176.6, 176.4, 177, 178.6, 179.6];

const N = 34; // spine points per fish
const TAU = Math.PI * 2;
const CYCLE = 44; // seconds: swim 22, gather 5, hold 10, release 5, swim 2
const ARC = 1.1 * Math.PI;

type Pt = { x: number; y: number };
type Fish = { k: number; chain: Pt[]; spine: Pt[] };
type Drop = { x: number; y: number; vx: number; vy: number; life: number; dec: number; r: number };
type Ripple = { x: number; y: number; age: number; max: number; R: number; a: number };

const sm = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** 0 = swimming, 1 = yin-yang formed. */
function weight(t: number) {
  const u = t % CYCLE;
  if (u < 22) return 0;
  if (u < 27) return sm((u - 22) / 5);
  if (u < 37) return 1;
  if (u < 42) return 1 - sm((u - 37) / 5);
  return 0;
}

export default function GoldKoiYinYang() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!host || !canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tex = new Image();
    let texReady = false;
    let cancelled = false;
    tex.onload = () => {
      texReady = true;
    };
    tex.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    tex.src = TEX_SRC;

    let W = 0, H = 0, dpr = 1, m = 0, cx = 0, cy = 0, fx = 0, fy = 0, L = 0, seg = 1, aw = 0, ah = 0;
    let lite = false;
    let clock = 0;
    let raf = 0;
    let lastNow = performance.now();
    let frames = 0;
    let slow = 0;
    let lastRip = 0;
    const drops: Drop[] = [];
    const ripples: Ripple[] = [];
    const fish: Fish[] = [0, 1].map((k) => ({ k, chain: [], spine: Array.from({ length: N }, () => ({ x: 0, y: 0 })) }));
    let table: { A: number[]; R: number[]; cum: number[]; tot: number } | null = null;

    const RF = () => m * 0.27;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5);
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      aw = W * 0.92;
      ah = H * 0.9;
      cx = W / 2;
      cy = H / 2;
      fx = W * 0.8; // yin-yang sits on the right, away from the centred text
      fy = H * 0.5;
      m = Math.min(W * 0.55, H * 0.95);
      L = m * 0.62;
      seg = L / (N - 1);
      table = null;
    };

    const headPath = (k: number, t: number): Pt => {
      const th = 0.2 * t + k * Math.PI + 0.35 * Math.sin(0.37 * t + k * 1.7);
      const rx = aw * 0.36 * (1 + 0.12 * Math.sin(0.21 * t + k * 2));
      const ry = ah * 0.34 * (1 + 0.12 * Math.sin(0.27 * t + 1 + k));
      return { x: cx + rx * Math.cos(th), y: cy + ry * Math.sin(th) };
    };

    // Spiral target with equal arc-length steps, so the texture is never squeezed in the curl.
    const buildTable = () => {
      const n = 400;
      const A: number[] = [];
      const R: number[] = [];
      const cum: number[] = [0];
      let px = 0, py = 0;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const a = -u * ARC;
        const r = RF() * (1 - 0.7 * Math.pow(u, 0.9));
        const x = r * Math.cos(a), y = r * Math.sin(a);
        A.push(a);
        R.push(r);
        if (i > 0) cum.push(cum[i - 1] + Math.hypot(x - px, y - py));
        px = x;
        py = y;
      }
      table = { A, R, cum, tot: cum[n] };
    };
    const formPt = (k: number, s: number, t: number): Pt => {
      if (!table) buildTable();
      const T = table!;
      const target = s * T.tot;
      let lo = 0, hi = T.A.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (T.cum[mid] <= target) lo = mid; else hi = mid;
      }
      const span = T.cum[hi] - T.cum[lo] || 1;
      const f = (target - T.cum[lo]) / span;
      const a = lerp(T.A[lo], T.A[hi], f) + 0.12 * t + k * Math.PI;
      const r = lerp(T.R[lo], T.R[hi], f);
      return { x: fx + r * Math.cos(a), y: fy + r * Math.sin(a) };
    };

    const initFish = (t: number) => {
      fish.forEach((f) => {
        f.chain = [];
        for (let i = 0; i < N; i++) f.chain.push(headPath(f.k, t - i * 0.3));
        f.chain[0] = headPath(f.k, t);
        for (let i = 1; i < N; i++) {
          const a = f.chain[i - 1], b = f.chain[i];
          const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
          f.chain[i] = { x: a.x + (dx / l) * seg, y: a.y + (dy / l) * seg };
        }
      });
    };
    const stepFish = (f: Fish, t: number) => {
      f.chain[0] = headPath(f.k, t);
      for (let i = 1; i < N; i++) {
        const a = f.chain[i - 1], b = f.chain[i];
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
        f.chain[i] = { x: a.x + (dx / l) * seg, y: a.y + (dy / l) * seg };
      }
    };
    const buildSpine = (f: Fish, t: number, w: number) => {
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1), c = f.chain[i];
        const pr = f.chain[Math.max(0, i - 1)], nx = f.chain[Math.min(N - 1, i + 1)];
        const dx = nx.x - pr.x, dy = nx.y - pr.y, l = Math.hypot(dx, dy) || 1;
        const und = seg * 0.9 * Math.sin(t * 2.0 - i * 0.42 + f.k * 1.7) * (0.2 + 0.8 * s) * (1 - 0.75 * w);
        const sx = c.x + (-dy / l) * und, sy = c.y + (dx / l) * und;
        const fp = formPt(f.k, s, t), wi = sm(clamp(w * 1.25 - 0.25 * s, 0, 1));
        f.spine[i].x = lerp(sx, fp.x, wi);
        f.spine[i].y = lerp(sy, fp.y, wi);
      }
    };

    const drawFish = (f: Fish) => {
      const P = f.spine, M = N - 1;
      const S = L / TEX_W, TS = S * 1.25;
      if (!lite) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(P[0].x, P[0].y);
        for (let i = 1; i < N; i++) ctx.lineTo(P[i].x, P[i].y);
        ctx.strokeStyle = "rgba(255,190,40,.05)";
        ctx.lineWidth = L * 0.07;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,210,70,.06)";
        ctx.lineWidth = L * 0.032;
        ctx.stroke();
        ctx.restore();
      }
      const sw = TEX_W / M;
      for (let i = M - 1; i >= 0; i--) {
        // tail to head, so the head is on top
        const a = P[i], b = P[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
        const j = M - 1 - i, sx = j * sw, yc = TEX_YC[j];
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(ang);
        ctx.scale(-1, 1); // head is on the right of the texture
        ctx.drawImage(tex, sx, 0, sw + 0.8, TEX_H, -len * 1.12, -yc * TS, len * 1.12 + 0.5, TEX_H * TS);
        ctx.restore();
      }
    };

    const updateFx = (t: number, dt: number, w: number) => {
      fish.forEach((f) => {
        const T = f.spine[N - 1], pT = f.spine[N - 2];
        if (!lite && Math.random() < dt * (1.6 + 3 * Math.abs(Math.sin(t * 0.5))) && drops.length < 45) {
          const dx = T.x - pT.x, dy = T.y - pT.y, l = Math.hypot(dx, dy) || 1, sp = 20 + Math.random() * 60;
          drops.push({ x: T.x, y: T.y, vx: (dx / l) * sp + (Math.random() - 0.5) * 50, vy: (dy / l) * sp + (Math.random() - 0.5) * 50, life: 1, dec: 0.45 + Math.random() * 0.5, r: 1 + Math.random() * 3 });
        }
      });
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.985; d.vy *= 0.985; d.life -= d.dec * dt;
        if (d.life <= 0) drops.splice(i, 1);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age >= ripples[i].max) ripples.splice(i, 1);
      }
      if (t - lastRip > (w > 0.95 ? 1.6 : 2.6)) {
        lastRip = t;
        if (w > 0.95) ripples.push({ x: fx, y: fy, age: 0, max: 3.6, R: m * 0.45, a: 0.3 });
        else {
          const h = fish[Math.floor(Math.random() * 2)].spine[0];
          ripples.push({ x: h.x, y: h.y, age: 0, max: 3, R: m * 0.14, a: 0.22 });
        }
      }
    };
    const drawFx = () => {
      ctx.globalCompositeOperation = "lighter";
      ripples.forEach((r) => {
        const u = r.age / r.max;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.R * u, 0, TAU);
        ctx.strokeStyle = `rgba(255,200,60,${(r.a * (1 - u)).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      drops.forEach((d) => {
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 3);
        g.addColorStop(0, `rgba(255,236,150,${(0.85 * d.life).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,190,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 3, 0, TAU);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    };
    const drawRing = (w: number) => {
      if (w <= 0.05) return;
      ctx.beginPath();
      ctx.arc(fx, fy, RF() * 1.07, 0, TAU);
      ctx.strokeStyle = `rgba(255,215,0,${(0.22 * w).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const pg = ctx.createRadialGradient(fx, fy, 0, fx, fy, RF() * 0.5);
      pg.addColorStop(0, `rgba(255,225,120,${(0.26 * w).toFixed(3)})`);
      pg.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = pg;
      ctx.fillRect(fx - RF(), fy - RF(), RF() * 2, RF() * 2);
    };

    const render = (t: number, dt: number) => {
      const w = weight(t);
      ctx.clearRect(0, 0, W, H);
      fish.forEach((f) => {
        stepFish(f, t);
        buildSpine(f, t, w);
      });
      drawRing(w);
      updateFx(t, dt, w);
      if (texReady) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        fish.forEach(drawFish);
      }
      drawFx();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) {
        lastNow = now;
        return;
      }
      const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
      lastNow = now;
      clock += dt;
      if (!lite) {
        frames++;
        if (dt > 0.034) slow++;
        if (frames === 90) {
          if (slow > 45) {
            lite = true;
            resize();
            initFish(clock);
          }
          frames = 0;
          slow = 0;
        }
      }
      render(clock, dt);
    };

    resize();
    initFish(reduce ? 30 : 0);
    const ro = new ResizeObserver(() => {
      resize();
      initFish(clock);
      if (reduce) render(30, 0.016);
    });
    ro.observe(host);
    if (reduce) {
      clock = 30;
      tex.addEventListener("load", () => render(30, 0.016));
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  if (failed) return <GoldFishTank />;
  return (
    <div className="ar-tank" ref={hostRef} aria-hidden>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.55 }} />
    </div>
  );
}