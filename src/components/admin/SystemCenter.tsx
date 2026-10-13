"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { cardClass } from "@/components/ui/styles";

interface SystemData {
  product: { name: string; version: string; owner: string; year: number };
  license: { configured: boolean; status: "AKTIF" | "REFERENSI"; clientId: string | null; employeeLimit: number | null; employeeCount: number; ownerGenerated: boolean };
  support: { phone: string; whatsapp: string; email: string; website: string; websiteLabel: string };
  system: {
    uptimeMin: number;
    database: { ok: boolean; ms: number; sizeKb: number | null };
    otp: { email: boolean; whatsapp: boolean };
    lastBackup: { at: string; by: string } | null;
    canBackup: boolean;
    now: string;
  };
  changelog: Array<{ group: string; text: string }>;
  viewer: { role: string; canSeeAudit: boolean };
}

interface AuditRow {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  detail: string | null;
}
interface AuditData {
  total: number;
  page: number;
  pageSize: number;
  actions: Array<{ id: string; label: string }>;
  rows: AuditRow[];
}

const HELP: Record<string, Array<{ t: string; d: string }>> = {
  OWNER: [
    { t: "Menyetujui kasbon", d: "Buka Kasbon, pilih tab Karyawan atau Terapis, lalu setujui atau tolak. Nominal boleh diubah saat menyetujui." },
    { t: "Melihat totalan", d: "Laporan Totalan menampilkan pendapatan, kasbon, dan sisa gaji per periode (harian, mingguan, bulanan). Tersedia tombol CSV dan Print." },
    { t: "Slip pay", d: "Rincian Totalan berisi slip pay per Tera/Karyawan. Kasbon dan voucher masuk otomatis; tambahkan Ambil Barang atau potongan lain lewat Tambah Rincian." },
    { t: "Resign dan Hapus", d: "Dua aksi ini meminta kode konfirmasi yang dikirim ke email Owner, supaya data tidak terhapus tanpa sepengetahuan Owner." },
    { t: "Backup", d: "Unduh backup database dari kartu Status Sistem di halaman ini, lalu simpan di tempat aman." },
  ],
  ADMIN_PUSAT: [
    { t: "Memasukkan pendapatan", d: "Buka Input Pendapatan, pilih Tera, level, lokasi, dan jumlah VCR. Voucher langsung masuk ke slip pay Tera." },
    { t: "Mentransfer kasbon", d: "Setelah Owner/Manager menyetujui, buka Kasbon lalu tekan Tandai Sudah Ditransfer setelah dana dikirim." },
    { t: "Absensi", d: "Absensi Harian menampilkan grid kehadiran per bulan; Lokasi, Absensi & Kalender menampilkan peta dan pengingat." },
    { t: "Data karyawan", d: "Data Tera dan Data Karyawan bisa dilihat dan dicari. Perubahan data dilakukan Owner atau Manager." },
  ],
};
HELP.CONSULTANT = HELP.OWNER;
HELP.MANAGER = HELP.OWNER;
const HELP_COMMON = [
  { t: "Tampilan tidak berubah?", d: "Tekan tombol Segarkan (ikon panah melingkar) di bagian atas, atau Ctrl+F5 di komputer." },
  { t: "Screenshot", d: "Tekan ikon screenshot di bagian atas, geser untuk memilih area, lalu lepas. Gambar tersimpan sebagai PNG." },
  { t: "Notifikasi", d: "Ikon lonceng menampilkan pemberitahuan terbaru. Nada bisa dipilih lewat tombol Suara di dalamnya." },
];

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-ar-green" : "bg-ar-red"}`} />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ar-line last:border-0 text-[12px]">
      <span className="text-ar-dim shrink-0">{label}</span>
      <span className="text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

function CardTitle({ icon, children }: { icon: "shield" | "chart" | "receipt" | "briefcase" | "megaphone" | "calendar-check"; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-[10px] tracking-[0.16em] uppercase text-ar-gold">
      <Icon name={icon} className="w-4 h-4" />
      {children}
    </div>
  );
}

export default function SystemCenter() {
  const [data, setData] = useState<SystemData | null>(null);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [auditAction, setAuditAction] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/system")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error ?? "Gagal memuat.")))
      .catch(() => setError("Gagal memuat Pusat Sistem."));
  }, []);

  const canSeeAudit = data?.viewer.canSeeAudit ?? false;
  const loadAudit = useCallback(() => {
    const qs = new URLSearchParams({ page: String(auditPage) });
    if (auditAction) qs.set("action", auditAction);
    fetch(`/api/admin/audit?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAudit(d))
      .catch(() => {});
  }, [auditAction, auditPage]);
  useEffect(() => {
    if (canSeeAudit) loadAudit();
  }, [canSeeAudit, loadAudit]);

  if (error) return <div className="mt-6 text-[12.5px] text-ar-red">{error}</div>;
  if (!data) return <div className="mt-6 text-[12.5px] text-ar-dim">Memuat…</div>;

  const { product, license, support, system } = data;
  const help = [...(HELP[data.viewer.role] ?? HELP.ADMIN_PUSAT), ...HELP_COMMON];
  const lastPage = audit ? Math.max(1, Math.ceil(audit.total / audit.pageSize)) : 1;

  return (
    <div className="mt-6 flex flex-col gap-5 max-w-5xl">
      {/* Hak cipta — always on a dark plate so the gold reads in both Siang and Malam. */}
      <div className="rounded-3xl border border-ar-goldline px-6 py-9 sm:py-12 text-center overflow-hidden relative" style={{ background: "radial-gradient(120% 140% at 50% 0%, #1a1408 0%, #09090b 62%)" }}>
        <div className="text-[10.5px] tracking-[0.34em] uppercase" style={{ color: "#d8c28a" }}>
          Hak cipta &copy; {product.year}
        </div>
        <div className="ar-copyright-gold text-[40px] sm:text-[68px] leading-[1.05] mt-3 tracking-[-0.01em]">{product.owner}</div>
        <div className="text-[11px] tracking-[0.2em] uppercase mt-4" style={{ color: "#bfae80" }}>
          {product.name} &middot; Versi {product.version} &middot; Seluruh hak dilindungi
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <CardTitle icon="shield">Tentang &amp; Lisensi</CardTitle>
          <Row label="Produk">{product.name}</Row>
          <Row label="Versi">{product.version}</Row>
          <Row label="Pemilik hak cipta">{product.owner}</Row>
          <Row label="Status lisensi">
            <span className="inline-flex items-center gap-1.5">
              <Dot ok />
              {license.status === "AKTIF" ? "Aktif" : "Instansi referensi (tanpa batas lisensi)"}
            </span>
          </Row>
          {license.clientId && <Row label="ID lisensi">{license.clientId}</Row>}
          <Row label="Paket">
            {license.employeeLimit === null ? "Tanpa batas" : `${license.employeeLimit} karyawan/Tera`}
            <span className="text-ar-faint"> · terpakai {license.employeeCount}</span>
          </Row>
          <Row label="Identitas Owner">{license.ownerGenerated ? "Sudah dipatenkan" : "Belum di-generate"}</Row>
          <Row label="Call Center">
            <a href={`tel:${support.phone.replace(/\D/g, "")}`} className="text-ar-gold underline-offset-4 hover:underline">
              {support.phone}
            </a>
          </Row>
          <Row label="Website">
            <a href={support.website} target="_blank" rel="noopener noreferrer" className="text-ar-gold underline-offset-4 hover:underline">
              {support.websiteLabel}
            </a>
          </Row>
          <Row label="Email resmi">
            <a href={`mailto:${support.email}`} className="text-ar-gold underline-offset-4 hover:underline">
              {support.email}
            </a>
          </Row>
        </div>

        <div className={cardClass}>
          <CardTitle icon="chart">Status Sistem</CardTitle>
          <Row label="Server">
            <span className="inline-flex items-center gap-1.5">
              <Dot ok /> Berjalan · {system.uptimeMin < 60 ? `${system.uptimeMin} menit` : `${Math.floor(system.uptimeMin / 60)} jam`}
            </span>
          </Row>
          <Row label="Database">
            <span className="inline-flex items-center gap-1.5">
              <Dot ok={system.database.ok} /> {system.database.ok ? `Normal · ${system.database.ms} ms` : "Bermasalah"}
              {system.database.sizeKb !== null && <span className="text-ar-faint"> · {(system.database.sizeKb / 1024).toFixed(1)} MB</span>}
            </span>
          </Row>
          <Row label="Kode OTP via email">
            <span className="inline-flex items-center gap-1.5"><Dot ok={system.otp.email} /> {system.otp.email ? "Aktif" : "Belum diatur"}</span>
          </Row>
          <Row label="Kode OTP via WhatsApp">
            <span className="inline-flex items-center gap-1.5"><Dot ok={system.otp.whatsapp} /> {system.otp.whatsapp ? "Aktif" : "Belum diatur"}</span>
          </Row>
          {system.canBackup && (
            <>
              <Row label="Backup terakhir">
                {system.lastBackup ? `${fmtDateTime(system.lastBackup.at)} · ${system.lastBackup.by}` : "Belum pernah diunduh"}
              </Row>
              <div className="pt-3">
                <a
                  href="/api/admin/backup"
                  onClick={() => setTimeout(() => window.location.reload(), 2500)}
                  className="inline-flex items-center gap-2 py-2.5 px-4 rounded-[10px] border border-ar-goldline text-ar-gold text-[11.5px] font-semibold tracking-[0.08em] uppercase"
                >
                  Unduh backup database
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <CardTitle icon="receipt">Catatan pembaruan · yang baru di versi ini</CardTitle>
        {data.changelog.length === 0 ? (
          <div className="text-[12px] text-ar-faint">Belum ada catatan.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.changelog.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] leading-[1.6]">
                <span className="shrink-0 mt-0.5 h-fit w-[86px] text-center py-0.5 rounded-full bg-ar-goldfill text-ar-text text-[9px] tracking-[0.08em] uppercase">{c.group}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canSeeAudit && (
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <CardTitle icon="calendar-check">Riwayat aktivitas</CardTitle>
            <select
              value={auditAction}
              onChange={(e) => {
                setAuditAction(e.target.value);
                setAuditPage(1);
              }}
              className="py-2 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12px]"
              aria-label="Filter aktivitas"
            >
              <option value="">Semua aktivitas</option>
              {audit?.actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          {!audit || audit.rows.length === 0 ? (
            <div className="text-[12px] text-ar-faint py-3">
              Belum ada aktivitas tercatat. Perubahan gaji, keputusan kasbon, penghapusan data, dan unduh backup akan muncul di sini.
            </div>
          ) : (
            <div className="flex flex-col">
              {audit.rows.map((r) => (
                <div key={r.id} className="grid gap-x-4 gap-y-0.5 py-2.5 border-b border-ar-line last:border-0 sm:grid-cols-[110px_1fr_1.4fr] text-[12px]">
                  <span className="text-ar-dim">{fmtDateTime(r.at)}</span>
                  <span>
                    <span className="text-ar-text">{r.action}</span>
                    <span className="block text-[10.5px] text-ar-faint">oleh {r.actor} ({r.role})</span>
                  </span>
                  <span className="min-w-0 break-words">
                    {r.target}
                    {r.detail && <span className="block text-[11px] text-ar-dim">{r.detail}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {audit && audit.total > audit.pageSize && (
            <div className="flex items-center justify-between mt-3 text-[11.5px] text-ar-dim">
              <button disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)} className="py-1.5 px-3 border border-ar-line rounded-[9px] disabled:opacity-40 cursor-pointer">
                Sebelumnya
              </button>
              <span>
                Halaman {auditPage} / {lastPage}
              </span>
              <button disabled={auditPage >= lastPage} onClick={() => setAuditPage((p) => p + 1)} className="py-1.5 px-3 border border-ar-line rounded-[9px] disabled:opacity-40 cursor-pointer">
                Berikutnya
              </button>
            </div>
          )}
        </div>
      )}

      <div className={cardClass}>
        <CardTitle icon="megaphone">Bantuan</CardTitle>
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {help.map((h) => (
            <div key={h.t} className="text-[12px] leading-[1.6]">
              <div className="text-ar-text font-semibold">{h.t}</div>
              <div className="text-ar-dim">{h.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={support.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-2.5 px-5 ar-grad rounded-[11px] text-ar-ongold text-[11.5px] font-bold tracking-[0.14em] uppercase"
          >
            Hubungi Support (WhatsApp)
          </a>
          <span className="text-[11.5px] text-ar-dim">Call Center {support.phone}</span>
        </div>
      </div>
    </div>
  );
}
