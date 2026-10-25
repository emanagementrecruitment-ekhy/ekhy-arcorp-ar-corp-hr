import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Central brand assets (LOGIN logo + gold icons). The vendor's license server hosts the master copy
 * at <LICENSE_SERVER_URL>/brand/<name>.png so a single change there re-brands every client.
 * If the server is unreachable or has no such file, we fall back to the copy bundled in
 * public/brand-default so the UI never shows a broken image.
 */
const ALLOWED = new Set([
  "login-emas", "screenshot", "refresh", "notifikasi", "absensi", "hr-office",
  "report", "pengumuman", "lapangan", "pengaturan", "ringkasan",
]);

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name: raw } = await ctx.params;
  const name = raw.replace(/\.png$/, "");
  if (!ALLOWED.has(name)) return new Response("Not found", { status: 404 });

  const base = process.env.LICENSE_SERVER_URL?.replace(/\/$/, "");
  if (base) {
    try {
      const res = await fetch(`${base}/brand/${name}.png`, { signal: AbortSignal.timeout(3000), next: { revalidate: 300 } });
      if (res.ok && (res.headers.get("content-type") ?? "").startsWith("image/")) {
        return new Response(await res.arrayBuffer(), {
          headers: { "content-type": "image/png", "cache-control": "public, max-age=300" },
        });
      }
    } catch {
      // fall through to the bundled copy
    }
  }
  const file = await readFile(path.join(process.cwd(), "public", "brand-default", `${name}.png`));
  return new Response(new Uint8Array(file), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=300" },
  });
}
