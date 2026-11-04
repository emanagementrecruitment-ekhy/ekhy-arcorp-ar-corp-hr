import "server-only";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { BRAND } from "@/lib/brand";
import { usesVcr } from "@/lib/constants";

export interface BackupPerson {
  code: string;
  name: string;
  role: string;
  status: string;
  email: string;
  phone: string;
  place: string;
  joinedAt: Date | null;
}

type Group = { title: string; rows: BackupPerson[] };

const COLS = ["Kode", "Nama", "Peran", "Email", "Telepon", "Domisili", "Bergabung"] as const;

function cells(p: BackupPerson): string[] {
  return [p.code, p.name, p.role, p.email, p.phone, p.place, p.joinedAt ? p.joinedAt.toISOString().slice(0, 10) : "-"];
}

/** Active/resigned x Karyawan/Terapis, in the order they appear in the sheet and the PDF. */
export function groupPeople(people: BackupPerson[]): Group[] {
  const pick = (status: string, tera: boolean) => people.filter((p) => (p.status === "RESIGN") === (status === "RESIGN") && usesVcr(p.role) === tera);
  return [
    { title: "Karyawan Aktif", rows: pick("AKTIF", false) },
    { title: "Terapis Aktif", rows: pick("AKTIF", true) },
    { title: "Karyawan Resign", rows: pick("RESIGN", false) },
    { title: "Terapis Resign", rows: pick("RESIGN", true) },
  ];
}

function workbook(groups: Group[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const g of groups) {
    const ws = XLSX.utils.aoa_to_sheet([[...COLS], ...g.rows.map(cells)]);
    ws["!cols"] = [{ wch: 10 }, { wch: 26 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 22 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, g.title);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Data backup that leaves the system: spreadsheet-style tables inside a PDF (locked with the Owner's passphrase), with the
 * same data as a real Excel file attached inside that PDF. Active and resigned, Karyawan and Terapis kept apart.
 */
export function buildBackupPdf(people: BackupPerson[], passphrase: string, owner: string): Promise<Buffer> {
  const groups = groupPeople(people);
  const xlsx = workbook(groups);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 30,
      userPassword: passphrase,
      ownerPassword: passphrase,
      permissions: { printing: "highResolution", copying: false, modifying: false },
      info: { Title: `Backup Data ${BRAND.short} ${stamp}` },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.file(xlsx, { name: `backup-data-${stamp}.xlsx`, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", description: "Data dalam format Excel" });

    const widths = [55, 130, 110, 160, 85, 120, 60];
    const x0 = doc.page.margins.left;
    const drawRow = (vals: readonly string[], y: number, bold: boolean) => {
      let x = x0;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(bold ? "#111111" : "#222222");
      if (bold) doc.rect(x0, y - 2, widths.reduce((a, b) => a + b, 0), 13).fill("#efe3bf").fillColor("#111111");
      vals.forEach((v, i) => {
        doc.text(v, x + 2, y, { width: widths[i] - 4, height: 10, ellipsis: true, lineBreak: false });
        x += widths[i];
      });
    };

    doc.font("Helvetica-Bold").fontSize(15).fillColor("#111111").text(`BACKUP DATA ${BRAND.short.toUpperCase()}`);
    doc.font("Helvetica").fontSize(8.5).fillColor("#555555").text(`Dibuat ${stamp} oleh ${owner}. File Excel (.xlsx) ikut terlampir di dalam PDF ini (panel Lampiran).`);
    doc.text("Data (slip pay, kasbon, absensi, dll) tetap tersimpan di server setelah karyawan/Terapis tidak lagi bekerja (tidak aktif), tanpa penghapusan otomatis, sehingga berkas tetap terlihat saat audit tahunan. Dokumen ini dikunci dengan kata sandi backup Anda; simpan di tempat aman.");
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111111").text(groups.map((g) => `${g.title}: ${g.rows.length}`).join("   |   "));
    doc.moveDown(0.6);

    for (const g of groups) {
      if (doc.y > doc.page.height - 90) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#8a6d1f").text(`${g.title} (${g.rows.length})`);
      doc.moveDown(0.3);
      let y = doc.y;
      drawRow(COLS, y, true);
      y += 14;
      if (g.rows.length === 0) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor("#777777").text("Tidak ada data.", x0 + 2, y);
        y += 14;
      }
      for (const p of g.rows) {
        if (y > doc.page.height - 50) {
          doc.addPage();
          y = doc.page.margins.top;
          drawRow(COLS, y, true);
          y += 14;
        }
        drawRow(cells(p), y, false);
        y += 12;
      }
      doc.y = y + 10;
      doc.x = x0;
    }
    doc.end();
  });
}
