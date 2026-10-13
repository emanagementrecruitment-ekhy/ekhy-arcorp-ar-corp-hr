import "server-only";
import * as XLSX from "xlsx";
import { jakartaClock } from "./assistant-rules";
import { SHEET_BLOCK_CATEGORIES } from "./payslip-sheet";

// Fill-in-the-blanks Excel templates for the bulk importers. The "Data" sheet is left EMPTY apart from its header
// row on purpose: sample rows live on the "Contoh & Panduan" sheet, so a template uploaded as-is can never import
// a made-up person. Column names here must match what the importers read (see each route's pickField calls).

const MONTH_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function currentMonth() {
  const key = jakartaClock(new Date()).dateKey; // YYYY-MM-DD in Jakarta
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return { year, month, label: `${MONTH_ID[month - 1]} ${year}`, ym: key.slice(0, 7), today: key };
}

function widths(sheet: XLSX.WorkSheet, cols: number[]) {
  sheet["!cols"] = cols.map((wch) => ({ wch }));
}

function book(sheets: [string, XLSX.WorkSheet][]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, sheet] of sheets) XLSX.utils.book_append_sheet(wb, sheet, name);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function xlsxResponse(buf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Monthly attendance report (one sheet, days 1-31) — read by the Absensi importer's "laporan bulanan" mode. */
export function absensiBulananTemplate(): Buffer {
  const { label } = currentMonth();
  const header: (string | number)[] = ["NO", "NAMA", "LINK", "GRADE"];
  for (let d = 1; d <= 31; d++) header.push(d);
  const data = XLSX.utils.aoa_to_sheet([[`LAPORAN ABSENSI BV ${label.toUpperCase()}`], [], [], header]);
  widths(data, [5, 22, 8, 14, ...Array(31).fill(4)]);
  const guide = XLSX.utils.aoa_to_sheet([
    ["Panduan — Absensi laporan bulanan"],
    [],
    ["1. Ganti bulan dan tahun di judul (sel A1), mis. LAPORAN ABSENSI BV NOVEMBER 2026. Bulan dibaca dari judul ini."],
    ["2. Mulai baris 5, isi satu terapis/karyawan per baris: NO (nomor urut), NAMA, LINK, GRADE."],
    ["3. Di kolom tanggal 1–31: isi ANGKA (jumlah VCR hari itu; 0 juga boleh) bila hadir. Kosongkan bila tidak hadir."],
    ["4. Huruf seperti O, M, P, S, I atau titik tidak dicatat sebagai hadir. Bagian VCR/Rp tidak ikut diimpor."],
    ["5. NAMA harus sama dengan Data Karyawan/Tera (nama depan saja boleh, mis. SHERLY untuk Sherly Amelia)."],
    ["6. Boleh membuat banyak bulan: satu sheet per bulan, judul tiap sheet memuat bulan dan tahunnya."],
    [],
    ["Contoh baris (jangan disalin ke sheet Data):"],
    ["NO", "NAMA", "LINK", "GRADE", 1, 2, 3, 4, 5, "..."],
    [1, "SHERLY", "EQ", "ROSE", 4, 0, "O", "", 3, "..."],
    ["Artinya: tanggal 1, 2, dan 5 hadir (4, 0, dan 3 VCR); tanggal 3 libur (O) dan tanggal 4 kosong = tidak dicatat."],
  ]);
  widths(guide, [110]);
  return book([[label.toUpperCase(), data], ["Contoh & Panduan", guide]]);
}

/** Monthly VCR/Pendapatan report: sheet name = "Oktober 2026", columns NO / NAMA / OUTLET / JUMLAH VCR / TOTAL. */
export function pendapatanTemplate(): Buffer {
  const { label } = currentMonth();
  const data = XLSX.utils.aoa_to_sheet([["NO", "NAMA", "OUTLET", "JUMLAH VCR", "TOTAL"]]);
  widths(data, [5, 24, 18, 14, 16]);
  const guide = XLSX.utils.aoa_to_sheet([
    ["Panduan — Pendapatan (VCR)"],
    [],
    [`1. Nama sheet Data harus berupa bulan dan tahun, mis. "${label}". Satu sheet per bulan; ganti nama sheet sesuai bulannya.`],
    ["2. Mulai baris 2: NO, NAMA, OUTLET, JUMLAH VCR, TOTAL (Rp). Tarif per voucher dihitung dari TOTAL dibagi JUMLAH VCR."],
    ["3. NAMA harus sama dengan Data Tera. Nama yang belum ada dibuatkan Tera baru dengan email/HP sementara — sebaiknya tambahkan dulu di Data Tera."],
    ["4. Baris dengan JUMLAH VCR atau TOTAL kosong/0 dilewati. OUTLET: HRV, CLASSIC T2, OFFICE, dst. (lihat daftar lokasi di template Karyawan)."],
    [],
    ["Contoh baris (jangan disalin ke sheet Data):"],
    ["NO", "NAMA", "OUTLET", "JUMLAH VCR", "TOTAL"],
    [1, "Dewi Lestari", "HRV", 4, 1600000],
    [],
    ["Format teks (.csv/.txt): kolom Bulan, Nama, Outlet, Jumlah VCR, Total — contoh isi: Oktober 2026,Dewi Lestari,HRV,4,1600000"],
  ]);
  widths(guide, [120]);
  return book([[label, data], ["Contoh & Panduan", guide]]);
}

export const KASBON_TEMPLATE_HEADERS = ["Kode Karyawan", "Nama (opsional)", "Tanggal", "Nominal", "Alasan", "Status", "Sudah Ditransfer"];

export function kasbonTemplate(): Buffer {
  const { today } = currentMonth();
  const data = XLSX.utils.aoa_to_sheet([KASBON_TEMPLATE_HEADERS]);
  widths(data, [16, 22, 14, 14, 36, 14, 18]);
  const guide = XLSX.utils.aoa_to_sheet([
    ["Panduan — Kasbon"],
    [],
    ["Untuk memasukkan kasbon lama/banyak sekaligus tanpa mengetik satu per satu."],
    ["Kode Karyawan: wajib, lihat di Data Karyawan/Data Tera (mis. AR-07, EQ-01). Kolom Nama hanya bantu memeriksa."],
    ["Tanggal: wajib, format YYYY-MM-DD (mis. 2026-10-13) atau 13/10/2026. Tidak boleh tanggal yang belum terjadi."],
    ["Nominal: wajib, angka rupiah (1500000 atau 1.500.000). Alasan: wajib."],
    ["Status: MENUNGGU (default bila kosong — belum menyentuh gaji), DISETUJUI, atau DITOLAK."],
    ["Hanya kasbon DISETUJUI yang dipotongkan di Slip Pay bulan tanggalnya. Sudah Ditransfer: Ya/Tidak (hanya untuk DISETUJUI)."],
    ["Upload ulang aman: kasbon yang sama (kode, tanggal, nominal, alasan) dilewati."],
    [],
    ["Contoh baris (jangan disalin ke sheet Data):"],
    KASBON_TEMPLATE_HEADERS,
    ["AR-07", "Rina Marlina", today, 500000, "Keperluan keluarga", "DISETUJUI", "Ya"],
  ]);
  widths(guide, [110]);
  return book([["Data", data], ["Contoh & Panduan", guide]]);
}

export const RINCIAN_TEMPLATE_HEADERS = ["Kode Karyawan", "Nama (opsional)", "Bulan", "Tanggal", "Keterangan", "Blok", "Qty", "Debit", "Kredit", "Catatan"];

export function rincianTemplate(): Buffer {
  const { ym, today } = currentMonth();
  const data = XLSX.utils.aoa_to_sheet([RINCIAN_TEMPLATE_HEADERS]);
  widths(data, [16, 22, 12, 14, 34, 18, 8, 14, 14, 24]);
  const guide = XLSX.utils.aoa_to_sheet([
    ["Panduan — Rincian Slip Pay (Rincian Totalan)"],
    [],
    ["Satu baris = satu baris rincian di Slip Pay seorang karyawan/Tera (biaya, potongan, tambahan)."],
    ["Kode Karyawan: wajib. Bulan: wajib, format 2026-10 atau Oktober 2026 (boleh kosong bila Tanggal diisi)."],
    ["Keterangan: wajib. Debit = uang masuk/tambahan untuk karyawan; Kredit = potongan. Isi salah satu saja."],
    [`Blok (opsional): ${SHEET_BLOCK_CATEGORIES.join(", ")}. Qty dan Catatan opsional.`],
    ["Total VCR dan Kasbon disetujui TIDAK perlu dimasukkan di sini — keduanya dihitung otomatis dari data Voucher dan Kasbon."],
    ["Upload ulang aman: baris yang sama persis (karyawan, bulan, tanggal, keterangan, debit, kredit) dilewati."],
    [],
    ["Contoh baris (jangan disalin ke sheet Data):"],
    RINCIAN_TEMPLATE_HEADERS,
    ["EQ-01", "Dewi Lestari", ym, today, "Biaya Mess", "", "", "", 300000, ""],
    ["EQ-01", "Dewi Lestari", ym, today, "Bonus target", "", "", 250000, "", "Bonus akhir bulan"],
  ]);
  widths(guide, [110]);
  return book([["Data", data], ["Contoh & Panduan", guide]]);
}
