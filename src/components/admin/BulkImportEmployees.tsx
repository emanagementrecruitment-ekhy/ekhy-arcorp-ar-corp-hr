"use client";

import { useRef, useState } from "react";

interface ImportResult {
  created: number;
  skippedLimit: number;
  errors: { row: number; name: string; error: string }[];
}

/**
 * Bulk-onboards many Karyawan/Tera in one upload instead of the one-at-a-time
 * form below — Excel/CSV/Text, same three formats as the Pendapatan importer
 * (see /api/admin/employees/import). Bad rows are reported individually
 * rather than failing the whole batch.
 */
export default function BulkImportEmployees({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/employees/import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengimpor file.");
        return;
      }
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between cursor-pointer">
        <span className="font-display text-[16px] text-ar-gold2">📁 Import Massal (Excel/CSV/Text)</span>
        <span className="text-[11px] text-ar-dim">{open ? "Tutup ▲" : "Buka ▼"}</span>
      </button>

      {open && (
        <div className="mt-3.5">
          <div className="text-[11px] text-ar-dim mb-3 leading-[1.6]">
            Isi satu file dengan satu baris per Karyawan/Tera, lalu upload sekali untuk semuanya — tidak perlu
            tambah satu-satu.{" "}
            <a href="/api/admin/employees/import" className="text-ar-gold underline">
              Unduh template kolomnya di sini
            </a>
            .
          </div>
          <label
            htmlFor="employee-import-file"
            className="flex flex-col items-center justify-center gap-1.5 w-full py-6 px-4 mb-3 bg-ar-input border-2 border-dashed border-ar-goldline rounded-[14px] text-center cursor-pointer hover:bg-ar-surface2 transition"
          >
            <span className="text-[13px] text-ar-gold2 font-semibold">{file ? "📄 " + file.name : "📁 Ketuk untuk pilih file"}</span>
            <span className="text-[10.5px] text-ar-dim">
              {file ? "Ketuk lagi untuk ganti file" : "Dari galeri/file di HP, atau folder di komputer · .xlsx / .xls / .csv / .txt"}
            </span>
          </label>
          <input
            ref={inputRef}
            id="employee-import-file"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            disabled={busy || !file}
            onClick={upload}
            className="w-full py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
          >
            {busy ? "Memproses…" : "Upload & Impor"}
          </button>
          {msg && <div className="mt-3 text-[11.5px] text-ar-red">{msg}</div>}
          {result && (
            <div className="mt-3.5 p-3.5 bg-[rgba(127,209,168,.1)] border border-[rgba(127,209,168,.3)] rounded-xl text-[11.5px] text-ar-green leading-[1.7]">
              ✓ {result.created} Karyawan/Tera baru berhasil ditambahkan.
              {result.skippedLimit > 0 && (
                <div className="text-ar-red mt-1">
                  {result.skippedLimit} baris dilewati — batas paket sudah tercapai. Hubungi vendor untuk upgrade paket.
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="text-ar-faint mt-2">
                  {result.errors.length} baris dilewati karena error:
                  <ul className="mt-1 list-disc list-inside">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Baris {e.row} ({e.name}): {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
