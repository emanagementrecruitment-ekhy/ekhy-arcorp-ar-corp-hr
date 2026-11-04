// Lets the person using this computer pick ONE folder where Slip Pay PDFs are saved (inside it, a subfolder per month).
// Uses the browser's File System Access API (Chrome / Edge on a computer). The choice is remembered in this browser only
// (IndexedDB), so each client / each computer keeps its own folder. Where the API is missing (Firefox, Safari, most phones)
// everything falls back to the normal download. Client-side only.
import { downloadBlob } from "./client-download";

interface DirHandle {
  name: string;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;
  queryPermission(d: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(d: { mode: "readwrite" }): Promise<PermissionState>;
}

const DB_NAME = "slip-folder";
const STORE = "handles";
const KEY = "payslip-root";

export function folderSaveSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function readHandle(): Promise<DirHandle | null> {
  if (!folderSaveSupported()) return null;
  try {
    return ((await idb("readonly", (s) => s.get(KEY))) as DirHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Name of the remembered folder, or null when none was chosen (or the browser cannot do it). */
export async function savedFolderName(): Promise<string | null> {
  return (await readHandle())?.name ?? null;
}

/** Opens the folder picker and remembers the choice. Returns the folder name, or null if the person cancelled. */
export async function chooseSaveFolder(): Promise<string | null> {
  if (!folderSaveSupported()) return null;
  try {
    const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
    const handle = await picker.call(window, { id: "slip-gaji", mode: "readwrite", startIn: "documents" });
    await idb("readwrite", (s) => s.put(handle, KEY));
    return handle.name;
  } catch {
    return null; // cancelled
  }
}

export async function forgetSaveFolder(): Promise<void> {
  try {
    await idb("readwrite", (s) => s.delete(KEY));
  } catch {
    // nothing to forget
  }
}

/** "2026-09" -> "Slip Pay September 2026" (one folder per month inside the chosen folder). */
export function monthFolderName(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(Date.UTC(y, (m || 1) - 1, 15)).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
  return `Slip Pay ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

/** Where in "Slip Pay <Bulan Tahun>/" a slip goes: active staff / Terapis, and the same two for people who resigned. */
export type SlipGroup = "Karyawan" | "Terapis" | "Resign Karyawan" | "Resign Terapis";

/** "2026-10" + "Terapis" -> "Slip Pay Oktober 2026/Terapis". */
export function slipSubfolder(month: string, group: SlipGroup): string {
  return `${monthFolderName(month)}/${group}`;
}

function safeSegment(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim() || "file";
}

/**
 * Saves `blob` as <chosen folder>/<subfolder>/<filename> when a folder is chosen and the browser still allows writing to it
 * (must be called from a click so the browser may ask once). Otherwise falls back to a normal download.
 * Returns where the file went.
 */
export async function saveFileToChosenFolder(blob: Blob, filename: string, subfolder: string): Promise<{ where: "folder" | "download"; folder?: string }> {
  const root = await readHandle();
  if (root) {
    try {
      let perm = await root.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") perm = await root.requestPermission({ mode: "readwrite" });
      if (perm === "granted") {
        // subfolder may be nested, e.g. "Slip Pay Oktober 2026/Terapis"
        let dir: DirHandle = root;
        for (const part of subfolder.split("/")) dir = await dir.getDirectoryHandle(safeSegment(part), { create: true });
        const file = await dir.getFileHandle(safeSegment(filename), { create: true });
        const w = await file.createWritable();
        await w.write(blob);
        await w.close();
        return { where: "folder", folder: `${root.name}/${subfolder.split("/").map(safeSegment).join("/")}` };
      }
    } catch {
      // folder moved/deleted or permission lost: fall through to the normal download
    }
  }
  downloadBlob(blob, filename);
  return { where: "download" };
}
