// Runs as a forked child process of the Electron main process (see main.js
// startLocalServer). Boots the bundled Next.js standalone server on an
// internal port, then fronts it with a small reverse proxy on the port the
// BrowserWindow actually loads — the proxy's only job beyond forwarding is
// to log successful mutating /api/** calls to an NDJSON file, so "Sinkron
// Sekarang" (see sync.js) has something to replay once the office is back
// online. Nothing here is Next/Prisma-specific — it works purely at the
// HTTP layer, so it doesn't need touching every time a new API route is
// added to the app.
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const fs = require("fs");
const config = require("./config");

const APP_DIR = process.env.ARCORP_APP_DIR;
const INTERNAL_PORT = Number(process.env.ARCORP_INTERNAL_PORT);
const PUBLIC_PORT = Number(process.env.ARCORP_PUBLIC_PORT);
const DB_PATH = process.env.ARCORP_LOCAL_DB_PATH;
const PENDING_SYNC_PATH = process.env.ARCORP_PENDING_SYNC_PATH;
const SESSION_SECRET = process.env.ARCORP_SESSION_SECRET;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isSyncable(pathname) {
  return !config.NON_SYNCABLE_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function appendPending(entry) {
  try {
    fs.appendFileSync(PENDING_SYNC_PATH, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error("[server-wrapper] failed to log pending sync entry:", e);
  }
}

const nextProc = spawn(process.execPath, ["server.js"], {
  cwd: APP_DIR,
  env: {
    ...process.env,
    PORT: String(INTERNAL_PORT),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: `file:${DB_PATH}`,
    SESSION_SECRET,
    // This whole wrapper is itself a `fork()`-ed child of the Electron main
    // process, so process.execPath here is the Electron binary, not a plain
    // "node" — without this flag, spawning it on "server.js" launches a
    // second full Electron/Chromium GUI trying to interpret that file as an
    // app entry (it hangs/misbehaves) instead of running it as a plain Node
    // script. Harmless (and unset) when this ever runs under real Node.
    ELECTRON_RUN_AS_NODE: "1",
    // There is no internet to actually deliver a real OTP email/WhatsApp/SMS
    // while offline anyway — this flag makes src/lib/otp.ts fall back to its
    // built-in console-logged + on-screen dev code, same as it already does
    // outside NODE_ENV=production, without touching NODE_ENV itself (Next's
    // standalone server.js is a production-mode artifact; forcing
    // NODE_ENV=development on it risks unrelated dev-only server behavior).
    ARCORP_LOCAL_MODE: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
nextProc.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
nextProc.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
nextProc.on("exit", (code) => console.log(`[server-wrapper] next server exited (${code})`));

function waitForPort(port, retries) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (n <= 0) return reject(new Error("Server lokal tidak merespons dalam waktu yang wajar."));
        setTimeout(() => attempt(n - 1), 500);
      });
    };
    attempt(retries);
  });
}

function startProxy() {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const bodyBuf = Buffer.concat(chunks);
      const pathname = req.url.split("?")[0];
      const shouldLog = MUTATING_METHODS.has(req.method) && pathname.startsWith("/api/") && isSyncable(pathname);

      const proxyReq = http.request(
        { host: "127.0.0.1", port: INTERNAL_PORT, path: req.url, method: req.method, headers: req.headers },
        (proxyRes) => {
          const resChunks = [];
          proxyRes.on("data", (c) => resChunks.push(c));
          proxyRes.on("end", () => {
            const resBuf = Buffer.concat(resChunks);
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            res.end(resBuf);

            if (shouldLog && proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
              appendPending({
                method: req.method,
                url: req.url,
                requestBody: bodyBuf.toString("utf8"),
                responseBody: resBuf.toString("utf8"),
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      );
      proxyReq.on("error", (e) => {
        if (!res.headersSent) res.writeHead(502);
        res.end("Bad gateway: " + e.message);
      });
      if (bodyBuf.length) proxyReq.write(bodyBuf);
      proxyReq.end();
    });
  });

  server.listen(PUBLIC_PORT, "127.0.0.1", () => {
    if (process.send) process.send({ type: "ready", port: PUBLIC_PORT });
  });
}

waitForPort(INTERNAL_PORT, 60)
  .then(startProxy)
  .catch((e) => {
    if (process.send) process.send({ type: "error", message: e.message });
    process.exit(1);
  });

process.on("SIGTERM", () => {
  nextProc.kill();
  process.exit(0);
});
