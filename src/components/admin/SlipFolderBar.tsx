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
  slipSubfolder,
  type SlipGroup,
} from "@/lib/save-to-folder";

/**
 * One simple box for "where do the Slip Pay PDFs go on this computer". The folder is picked once (Chrome/Edge); every
 * "Simpan PDF" then lands in <folder>/Slip Pay <Bulan Tahun>/<Karyawan | Terapis | Resign Karyawan | Resign Terapis>.
 * Without a chosen folder (or on a browser that cannot pick one) PDFs go to the normal Downloads folder.
 */
export function SlipFolderBox({ month, group }: { month: string; group: SlipGroup }) {
  const [supported, setSupported] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);

  useEffect(() => {
    // Browser capabilities are only known on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(folderSaveSupported());
    savedFolderName().then(setFolder);
  }, []);

  async function pick() {
    const name = await chooseSaveFolder();
    if (name) setFolder(name);
  }

  async function clear() {
    await forgetSaveFolder();
    setFolder(null);
  }

  return (
    <div className="p-3.5 bg-ar-surface border border-ar-goldline rounded-2xl text-[11.5px] text-ar-dim print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ar-gold font-semibold">📁 Folder penyimpanan slip</span>
        {supported ? (
          <span className="flex items-center gap-3">
            <button onClick={pick} className="py-1 px-3 rounded-[9px] border border-ar-goldline text-ar-gold text-[10.5px] font-bold tracking-[0.1em] uppercase cursor-pointer">
              {folder ? "Ganti folder" : "Pilih folder"}
            </button>
            {folder && (
              <button onClick={clear} className="underline underline-offset-4 cursor-pointer">
                Hapus pilihan
              </button>
            )}
          </span>
        ) : null}
      </div>
      <div className="mt-2 py-2 px-3 rounded-[10px] bg-ar-input border border-ar-line text-ar-text break-words">
        {folder ? `${folder} / ${slipSubfolder(month, group)}` : `Unduhan / (belum memilih folder)`}
      </div>
      <div className="mt-1.5 text-[10.5px] leading-[1.6]">
        {supported
          ? "Pilih satu folder di komputer ini. Di dalamnya slip dirapikan per bulan (contoh: "
          : "Browser ini belum bisa memilih folder, jadi PDF masuk ke folder Unduhan. Pakai Chrome atau Edge di komputer untuk memilih folder sendiri. Susunan folder: "}
        <b>{monthFolderName(month)}</b> → Karyawan, Terapis, Resign Karyawan, Resign Terapis{supported ? "). Pilihan hanya tersimpan di komputer ini." : "."}
      </div>
    </div>
  );
}

/** The folder box plus "save every slip of this month at once" for the people currently listed. */
export default function SlipFolderBar({
  month,
  group,
  people,
  pdfUrl,
}: {
  month: string;
  group: SlipGroup;
  people: { id: string; name: string }[];
  pdfUrl: (employeeId: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
        const res = await saveFileToChosenFolder(blob, filename, slipSubfolder(month, group));
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
    <div className="flex flex-col gap-2 print:hidden">
      <SlipFolderBox month={month} group={group} />
      <div className="flex flex-wrap items-center gap-2.5 text-[11.5px] text-ar-dim">
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
