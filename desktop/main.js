const { app, BrowserWindow, session, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const { fork } = require("child_process");
const config = require("./config");
const { runSync } = require("./sync");

let mainWindow = null;
let localServerProc = null;
let currentMode = "checking"; // "online" | "offline"
let reconnectTimer = null;

function checkOnline() {
  return new Promise((resolve) => {
    const req = https.get(
      config.RAILWAY_URL + "/login",
      { timeout: config.ONLINE_CHECK_TIMEOUT_MS },
      (res) => {
        res.resume();
        resolve(res.statusCode < 500);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const net = require("net");
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function userDataPaths() {
  const userData = app.getPath("userData");
  return {
    dbPath: path.join(userData, "local.db"),
    pendingSyncPath: path.join(userData, "pending-sync.ndjson"),
    sessionSecretPath: path.join(userData, "session-secret.txt"),
  };
}

/** Persisted per-install so local logins survive an app restart instead of invalidating every session each time. */
function getOrCreateSessionSecret() {
  const { sessionSecretPath } = userDataPaths();
  if (fs.existsSync(sessionSecretPath)) return fs.readFileSync(sessionSecretPath, "utf8").trim();
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(sessionSecretPath, secret);
  return secret;
}

async function startLocalServer() {
  const { dbPath, pendingSyncPath } = userDataPaths();
  if (!fs.existsSync(dbPath)) {
    const templatePath = path.join(process.resourcesPath, "template.db");
    fs.copyFileSync(templatePath, dbPath);
  }
  if (!fs.existsSync(pendingSyncPath)) fs.writeFileSync(pendingSyncPath, "");

  const internalPort = await freePort();
  const publicPort = await freePort();
  const appDir = path.join(process.resourcesPath, "nextapp");

  return new Promise((resolve, reject) => {
    localServerProc = fork(path.join(__dirname, "server-wrapper.js"), [], {
      env: {
        ...process.env,
        ARCORP_APP_DIR: appDir,
        ARCORP_INTERNAL_PORT: String(internalPort),
        ARCORP_PUBLIC_PORT: String(publicPort),
        ARCORP_LOCAL_DB_PATH: dbPath,
        ARCORP_PENDING_SYNC_PATH: pendingSyncPath,
        ARCORP_SESSION_SECRET: getOrCreateSessionSecret(),
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    localServerProc.stdout.on("data", (d) => console.log(d.toString().trimEnd()));
    localServerProc.stderr.on("data", (d) => console.error(d.toString().trimEnd()));
    localServerProc.on("message", (msg) => {
      if (msg.type === "ready") resolve(msg.port);
      if (msg.type === "error") reject(new Error(msg.message));
    });
    localServerProc.on("exit", (code) => console.log(`[main] local server exited (${code})`));
  });
}

function stopLocalServer() {
  if (localServerProc) {
    localServerProc.kill();
    localServerProc = null;
  }
}

/** "Slip Pay <Bulan> - <Nama>.pdf" downloads land in a real, auto-organized folder on disk instead of the browser's Downloads folder. */
function setupDownloadInterception() {
  session.defaultSession.on("will-download", (_event, item) => {
    const filename = item.getFilename();
    const match = filename.match(/^Slip Pay (.+?) - .+\.pdf$/i);
    if (!match) return;
    const monthLabel = match[1].trim();
    const folder = path.join(app.getPath("documents"), "AR Corp", `Slip Pay ${monthLabel}`);
    fs.mkdirSync(folder, { recursive: true });
    item.setSavePath(path.join(folder, filename));
  });
}

function pollReconnect() {
  if (reconnectTimer) clearInterval(reconnectTimer);
  reconnectTimer = setInterval(async () => {
    if (currentMode !== "offline") return;
    const online = await checkOnline();
    if (online && mainWindow) {
      mainWindow.webContents.send("arcorp:reconnected");
    }
  }, config.RECONNECT_POLL_MS);
}

async function goOnline() {
  currentMode = "online";
  await mainWindow.loadURL(config.RAILWAY_URL);
}

async function goOffline() {
  currentMode = "offline";
  try {
    const port = await startLocalServer();
    await mainWindow.loadURL(`http://127.0.0.1:${port}`);
  } catch (e) {
    dialog.showErrorBox("AR Corp Desktop", "Gagal menjalankan server lokal: " + e.message);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    title: "AR Corp Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const online = await checkOnline();
  if (online) await goOnline();
  else await goOffline();

  pollReconnect();
}

/**
 * "Sinkron Sekarang": send the office to Railway's own login page (the exact
 * same OTP login every user already knows) so the desktop app gets a real,
 * fresh Railway session — then replays everything queued from the offline
 * session against Railway using that session, and finally leaves the window
 * on Railway (fully online) since the whole point of syncing is to stop
 * relying on the local copy once the sync succeeds.
 */
async function syncNow() {
  if (currentMode !== "offline") {
    const { pendingSyncPath } = userDataPaths();
    return runSync({ pendingSyncPath, railwayUrl: config.RAILWAY_URL, cookie: await getRailwaySessionCookie() });
  }

  await mainWindow.loadURL(config.RAILWAY_URL + "/login");

  const loggedIn = await new Promise((resolve) => {
    const onNavigate = (_event, url) => {
      if (url.startsWith(config.RAILWAY_URL + "/admin") || url.startsWith(config.RAILWAY_URL + "/app")) {
        mainWindow.webContents.removeListener("did-navigate", onNavigate);
        resolve(true);
      }
    };
    mainWindow.webContents.on("did-navigate", onNavigate);
    // Give up waiting after 10 minutes so a closed/abandoned login doesn't hang forever.
    setTimeout(() => {
      mainWindow.webContents.removeListener("did-navigate", onNavigate);
      resolve(false);
    }, 10 * 60 * 1000);
  });

  if (!loggedIn) return { sent: 0, failed: 0, remaining: -1, failedDetails: [], cancelled: true };

  const cookie = await getRailwaySessionCookie();
  const { pendingSyncPath } = userDataPaths();
  const result = await runSync({ pendingSyncPath, railwayUrl: config.RAILWAY_URL, cookie });

  stopLocalServer();
  await goOnline();

  return result;
}

async function getRailwaySessionCookie() {
  const url = new URL(config.RAILWAY_URL);
  const cookies = await session.defaultSession.cookies.get({ domain: url.hostname, name: "arcorp_session" });
  if (!cookies.length) throw new Error("Sesi login Railway tidak ditemukan.");
  return `arcorp_session=${cookies[0].value}`;
}

ipcMain.handle("arcorp:get-mode", () => currentMode);
ipcMain.handle("arcorp:sync-now", () => syncNow());
ipcMain.handle("arcorp:open-slip-folder", () => {
  const folder = path.join(app.getPath("documents"), "AR Corp");
  fs.mkdirSync(folder, { recursive: true });
  shell.openPath(folder);
});

app.whenReady().then(() => {
  setupDownloadInterception();
  createWindow();
});

app.on("window-all-closed", () => {
  stopLocalServer();
  if (process.platform !== "darwin") app.quit();
});
