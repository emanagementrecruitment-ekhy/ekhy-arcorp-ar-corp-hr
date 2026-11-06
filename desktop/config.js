const { loadClient } = require("./client-config");

const CLIENT = loadClient();

module.exports = {
  CLIENT,
  // This client's own Railway server (from client.json, written by build-desktop.sh).
  RAILWAY_URL: CLIENT.serverUrl,
  // How long to wait for Railway to answer before falling back to local mode.
  ONLINE_CHECK_TIMEOUT_MS: 5000,
  // How often to re-check connectivity while running in local/offline mode,
  // so the app can offer "Sinkron Sekarang" as soon as internet is back.
  RECONNECT_POLL_MS: 30000,
  // API paths that must never be captured for offline replay — auth/session
  // and one-time-seal flows don't make sense to replay against Railway.
  NON_SYNCABLE_PATH_PREFIXES: [
    "/api/auth/",
    "/api/admin/owner-identity",
    "/api/owner-welcome",
    "/api/admin/settings",
    "/api/admin/backup",
    "/api/payslip/pdf",
    "/api/payslip/send",
    "/api/admin/payslip/pdf",
    "/api/admin/payslip/send",
  ],
};
