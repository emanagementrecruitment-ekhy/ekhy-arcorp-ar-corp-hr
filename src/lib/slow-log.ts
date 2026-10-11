// Slow-request logger. Writes one line to stdout (Railway log) for every
// request that takes longer than SLOW_MS, so real production bottlenecks show
// up with the route name and time. Cost per request: one hrtime read, one
// 'finish' listener and a number compare — nothing is written for fast requests.
import type { IncomingMessage, ServerResponse } from "node:http";

export const SLOW_MS = Number(process.env.SLOW_REQUEST_MS) > 0 ? Number(process.env.SLOW_REQUEST_MS) : 500;

/** Static assets are never interesting and would only add noise. */
export function isTrackedPath(url: string | undefined): boolean {
  if (!url) return false;
  return !url.startsWith("/_next/static") && !url.startsWith("/_next/image") && !url.startsWith("/favicon");
}

/** Keeps the path, drops the query string (it may carry names or tokens). */
export function pathOnly(url: string): string {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

export function isSlow(ms: number, threshold = SLOW_MS): boolean {
  return ms >= threshold;
}

export function formatSlowLine(method: string, url: string, status: number, ms: number): string {
  return `[slow] ${method} ${pathOnly(url)} ${status} ${Math.round(ms)}ms`;
}

let installed = false;

/** Patches the Node HTTP server once so every request is timed without touching any route. */
export async function installSlowRequestLogger(): Promise<void> {
  if (installed) return;
  installed = true;
  const http = await import("node:http");
  const proto = http.Server.prototype;
  const originalEmit = proto.emit;
  proto.emit = function patchedEmit(this: unknown, event: string | symbol, ...args: unknown[]) {
    if (event === "request") {
      const req = args[0] as IncomingMessage;
      const res = args[1] as ServerResponse;
      if (isTrackedPath(req.url)) {
        const start = process.hrtime.bigint();
        res.once("close", () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          if (isSlow(ms)) console.warn(formatSlowLine(req.method ?? "GET", req.url ?? "", res.statusCode, ms));
        });
      }
    }
    return (originalEmit as (...a: unknown[]) => boolean).call(this, event, ...args);
  } as typeof proto.emit;
}
