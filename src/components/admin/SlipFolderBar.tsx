"use client";

import { useEffect, useState } from "react";
import { fetchFile } from "@/lib/client-download";
import {
  chooseSaveFolder,
  folderSaveSupported,
  forgetSaveFolder,
  monthFolderName,
  saveFileToChosenFolder,
  savedFolderName,
} from "@/lib/save-to-folder";

/**
 * "Where do the Slip Pay PDFs go on this computer": the client picks a folder once (Chrome/Edge), then every
 * "Simpan PDF" lands in <folder>/Slip Pay <Bulan Tahun>/. Also saves every listed person's slip for the month in one go.
 */
export default function SlipFolderBar({
  month,
  people,
  pdfUrl,
}: {
  month: string;
  people: { id: string; name: string }[];
  pdfUrl: (employeeId: string) => string;
}) {
  const [supported, setSupported] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Browser capabilities are only known on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(folderSaveSupported());
    savedFolderName().then(setFolder);
  }, []);

  async function pick() {
    const name = await chooseSaveFolder();
    if (name) {
      setFolder(name);
      setMsg("");
    }
  }

  async function clear() {
    await forgetSaveFolder();
    setFolder(null);
    setMsg("");
  }

  async function saveAll() {
    if (people.length === 0) return;
    setBusy(true);
    setMsg("");
    let ok = 0;
    let failed = 0;
    let where = "";
    for (let i = 0; i < people.length; i++) {
      setMsg(`Menyimpan ${i + 1} dari ${people.length}…`);
      try {
        const { blob, filename } = await fetchFile(pdfUrl(people[i].id), "Slip Pay.pdf");
        const res = await saveFileToChosenFolder(blob, filename, monthFolderName(month));
        where = res.where === "folder" ? res.folder ?? "" : "Unduhan";
        ok++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    setMsg(`${ok} slip tersimpan di ${where || "Unduhan"}.${failed ? ` ${failed} gagal.` : ""}`);
  }

  return (
    <div className="p-3.5 bg-ar-surface border border-ar-line rounded-2xl text-[11.5px] text-ar-dim print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ar-gold font-semibold">Folder penyimpanan slip</span>
        {!supported && (
          <span>
            Browser ini belum bisa memilih folder, jadi PDF masuk ke folder Unduhan. Pakai Chrome atau Edge di komputer untuk memilih folder sendiri.
          </span>
        )}
        {supported && folder && (
          <>
            <span className="text-ar-text">📁 {folder}</span>
            <button onClick={pick} className="underline underline-offset-4 text-ar-gold cursor-pointer">Ganti</button>
            <button onClick={clear} className="underline underline-offset-4 cursor-pointer">Hapus pilihan</button>
          </>
        )}
        {supported && !folder && (
          <>
            <span>Belum dipilih — PDF masuk ke folder Unduhan.</span>
            <button onClick={pick} className="underline underline-offset-4 text-ar-gold cursor-pointer">Pilih folder</button>
          </>
        )}
      </div>
      <div className="mt-1.5 text-[10.5px]">
        Di dalam folder itu, slip otomatis dirapikan per bulan: <b>{monthFolderName(month)}</b>. Pilihan ini hanya tersimpan di komputer ini.
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <button
          disabled={busy || people.length === 0}
          onClick={saveAll}
          className="py-1.5 px-3 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[10.5px] font-bold tracking-[0.12em] uppercase cursor-pointer disabled:opacity-60"
        >
          {busy ? "Menyimpan…" : `Simpan semua slip bulan ini (${people.length})`}
        </button>
        {msg && <span>{msg}</span>}
      </div>
    </div>
  );
}
