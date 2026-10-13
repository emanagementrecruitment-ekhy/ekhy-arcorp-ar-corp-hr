"use client";

import { useRef, useState } from "react";
import { btnPrimaryClass, cardClass } from "@/components/ui/styles";

interface Card {
  id: string;
  title: string;
  purpose: string;
  columns: string;
  endpoint: string;
  templates: { href: string; label: string }[];
  roles: readonly string[];
}

const OFFICE = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"];
const OWNER_TIER = ["OWNER", "CONSULTANT", "MANAGER"];

const CARDS: Card[] = [
  {
    id: "karyawan",
    title: "Karyawan & Tera baru",
    purpose: "Daftarkan banyak karyawan/Tera sekaligus. Kode (AR-xx / EQ-xx) dibuat otomatis, mereka bisa langsung login.",
    columns: "Nama, Email, No HP, Peran, Lokasi, Level Pendapatan (Tera) atau Gaji (selain Tera)",
    endpoint: "/api/admin/employees/import",
    templates: [{ href: "/api/admin/employees/import", label: "Template Karyawan & Tera" }],
    roles: OFFICE,
  },
  {
    id: "absensi",
    title: "Absensi",
    purpose: "Catat kehadiran banyak hari sekaligus: daftar per tanggal, atau laporan bulanan satu sheet per bulan (angka di tanggal = hadir).",
    columns: "Daftar: Kode Karyawan, Tanggal · Laporan bulanan: NO, NAMA, LINK, GRADE, lalu tanggal 1–31",
    endpoint: "/api/admin/absensi/import",
    templates: [
      { href: "/api/admin/absensi/import", label: "Template daftar (Kode, Tanggal)" },
      { href: "/api/admin/absensi/import?format=bulanan", label: "Template laporan bulanan" },
    ],
    roles: OWNER_TIER,
  },
  {
    id: "pendapatan",
    title: "Pendapatan (VCR)",
    purpose: "Masukkan laporan VCR bulanan per terapis. Tarif per voucher dihitung dari total dibagi jumlah VCR.",
    columns: "NO, NAMA, OUTLET, JUMLAH VCR, TOTAL — nama sheet = bulan dan tahun (mis. Oktober 2026)",
    endpoint: "/api/admin/vouchers/import",
    templates: [{ href: "/api/admin/vouchers/import", label: "Template Pendapatan VCR" }],
    roles: OFFICE,
  },
  {
    id: "kasbon",
    title: "Kasbon",
    purpose: "Masukkan kasbon lama atau banyak sekaligus. Status kosong = menunggu keputusan Owner; hanya yang DISETUJUI memotong Slip Pay.",
    columns: "Kode Karyawan, Tanggal, Nominal, Alasan, Status, Sudah Ditransfer",
    endpoint: "/api/admin/kasbon/import",
    templates: [{ href: "/api/admin/kasbon/import", label: "Template Kasbon" }],
    roles: OWNER_TIER,
  },
  {
    id: "rincian",
    title: "Rincian Slip Pay",
    purpose: "Biaya, potongan, dan tambahan di Slip Pay (Admin, Mess, pinalty, bonus, dll). Total VCR dan kasbon disetujui dihitung otomatis, tidak perlu diisi.",
    columns: "Kode Karyawan, Bulan, Tanggal, Keterangan, Blok, Qty, Debit (masuk) atau Kredit (potongan), Catatan",
    endpoint: "/api/admin/payslip/import",
    templates: [{ href: "/api/admin/payslip/import", label: "Template Rincian Slip Pay" }],
    roles: OFFICE,
  },
];

const COUNT_LABELS: [string, string][] = [
  ["created", "baru dicatat"],
  ["vouchersInserted", "voucher dicatat"],
  ["employeesCreated", "karyawan baru dibuat"],
  ["alreadyMarked", "sudah ada sebelumnya"],
  ["alreadyExisting", "sudah ada sebelumnya"],
  ["skippedFuture", "tanggal belum terjadi dilewati"],
  ["skippedLimit", "melebihi batas paket"],
];

interface ImportError {
  row?: number;
  name?: string;
  info?: string;
  error: string;
}
type Result = Record<string, unknown> & { errors?: ImportError[] };

function ImportCard({ card }: { card: Card }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg("");
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(card.endpoint, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengimpor file.");
        return;
      }
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  const counts = result ? COUNT_LABELS.filter(([key]) => typeof result[key] === "number" && (result[key] as number) > 0) : [];
  const errors = result?.errors ?? [];

  return (
    <section className={cardClass}>
      <h2 className="font-display text-[17px] font-semibold text-ar-text">{card.title}</h2>
      <p className="mt-1.5 text-[12px] leading-[1.6] text-ar-dim">{card.purpose}</p>
      <p className="mt-2 text-[11px] leading-[1.6] text-ar-faint">
        <b className="text-ar-dim">Kolom:</b> {card.columns}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {card.templates.map((t) => (
          // File download from a route handler, not a page: next/link would client-navigate to it.
          <a key={t.href} href={t.href} className="rounded-full border border-ar-goldline bg-ar-goldfill px-3.5 py-1.5 text-[11.5px] font-medium text-ar-text">
            ⬇ {t.label}
          </a>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          htmlFor={`import-${card.id}`}
          className="flex-1 cursor-pointer truncate rounded-xl border-2 border-dashed border-ar-goldline bg-ar-input px-3 py-2.5 text-center text-[12px] text-ar-dim hover:bg-ar-surface2"
        >
          {file ? `📄 ${file.name}` : "📁 Pilih file Excel / CSV / Text"}
        </label>
        <input
          ref={inputRef}
          id={`import-${card.id}`}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button disabled={busy || !file} onClick={upload} className={`${btnPrimaryClass} px-5 py-2.5`}>
          {busy ? "Memproses…" : "Upload & Impor"}
        </button>
      </div>

      {msg && <div className="mt-3 text-[11.5px] text-ar-red">{msg}</div>}
      {result && (
        <div className="mt-3.5 rounded-xl border border-[rgba(127,209,168,.3)] bg-[rgba(127,209,168,.1)] p-3.5 text-[11.5px] leading-[1.7] text-ar-text">
          ✓ Selesai
          {counts.length > 0 && ` — ${counts.map(([key, label]) => `${result[key]} ${label}`).join(" · ")}`}.
          {errors.length > 0 && (
            <div className="mt-2 text-ar-dim">
              {errors.length} baris dilewati karena error:
              <ul className="mt-1 list-inside list-disc">
                {errors.slice(0, 40).map((e, i) => (
                  <li key={i}>
                    {e.row ? `Baris ${e.row} ` : ""}
                    {e.name || e.info ? `(${e.name ?? e.info}): ` : ""}
                    {e.error}
                  </li>
                ))}
              </ul>
              {errors.length > 40 && <div className="mt-1">…dan {errors.length - 40} lainnya.</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function ImportHub({ accessRole }: { accessRole: string }) {
  const cards = CARDS.filter((c) => c.roles.includes(accessRole));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ar-goldline bg-ar-goldfill p-4 text-[12px] leading-[1.7] text-ar-text">
        <b>Urutan yang disarankan:</b> 1) Karyawan & Tera baru → 2) Absensi → 3) Pendapatan (VCR) → 4) Kasbon → 5) Rincian Slip Pay. Isi
        template apa adanya (jangan ubah judul kolom), simpan, lalu upload. Baris yang salah dilewati dan alasannya ditampilkan, sisanya tetap
        masuk. Upload ulang file yang sama aman, data yang sudah ada tidak dobel.
      </div>
      {cards.map((c) => (
        <ImportCard key={c.id} card={c} />
      ))}
    </div>
  );
}
