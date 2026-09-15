const { contextBridge, ipcRenderer } = require("electron");

// Exposed as window.arcorpDesktop in every page the app loads (Railway's own
// pages included) — the web app's DesktopStatusBar component checks for its
// presence to know it's running inside this desktop wrapper at all, and is a
// silent no-op everywhere else (plain browser, mobile).
contextBridge.exposeInMainWorld("arcorpDesktop", {
  getMode: () => ipcRenderer.invoke("arcorp:get-mode"),
  syncNow: () => ipcRenderer.invoke("arcorp:sync-now"),
  openSlipFolder: () => ipcRenderer.invoke("arcorp:open-slip-folder"),
  onReconnected: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("arcorp:reconnected", handler);
    return () => ipcRenderer.removeListener("arcorp:reconnected", handler);
  },
  onSyncDone: (callback) => {
    const handler = (_event, result) => callback(result);
    ipcRenderer.on("arcorp:sync-done", handler);
    return () => ipcRenderer.removeListener("arcorp:sync-done", handler);
  },
});
