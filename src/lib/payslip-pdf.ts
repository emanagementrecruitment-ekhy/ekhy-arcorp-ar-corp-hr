import "server-only";
import PDFDocument from "pdfkit";
import type { Payslip } from "./payslip";

function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/**
 * "Slip Pay September 2026 - Budi Santoso.pdf" — the user asked for
 * downloads to land "seperti folder baru setiap bulan" (organized like a
 * fresh folder each month); a browser download has no real folder to place
 * the file into, so this leads every filename with the month instead, which
 * keeps a downloads listing sorted/grouped by month regardless.
 */
export function payslipFilename(payslip: Payslip): string {
  const safeName = payslip.employee.name.replace(/[\\/:*?"<>|]/g, "").trim();
  return `Slip Pay ${payslip.monthLabel} - ${safeName}.pdf`;
}

/**
 * Renders a Payslip as a one-page A4 PDF, server-side — the "Simpan PDF"
 * counterpart to the browser's own Print dialog (see PayslipDocument.tsx).
 * Kept deliberately plain (no logo image, no custom fonts) since pdfkit's
 * built-in Helvetica avoids shipping/loading any font files.
 */
export function generatePayslipPdf(payslip: Payslip): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(9).fillColor("#8a6d1f").font("Helvetica-Bold").text("AR CORP", { characterSpacing: 2 });
    doc.moveDown(0.2);
    doc.fontSize(20).fillColor("#111111").font("Helvetica-Bold").text("Slip Pay");
    doc.moveDown(0.8);

    doc.fontSize(10).font("Helvetica").fillColor("#111111");
    const info: Array<[string, string]> = [
      ["Nama", payslip.employee.name],
      ["Bulan", payslip.monthLabel],
      ["Divisi/Peran", payslip.employee.role],
      ["Grade", payslip.employee.levelLabel],
      ["Outlet/Lokasi Kerja", payslip.employee.place],
      [
        "Absensi Bulan Ini",
        payslip.attendance.trackingStarted
          ? `${payslip.attendance.hariHadir}/${payslip.attendance.totalDays} hari (${payslip.attendance.persen}%)`
          : "—",
      ],
    ];
    for (const [label, value] of info) {
      doc.text(`${label}: ${value}`);
    }
    doc.moveDown(0.8);

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#8a6d1f").text("RINCIAN PAYROLL", { characterSpacing: 1 });
    doc.moveDown(0.3);

    const colX = [48, 78, 125, 245, 303, 336, 407, 478];
    const colW = [28, 45, 115, 55, 28, 68, 68, 69];
    const headers = ["No", "Tanggal", "Rincian", "Biaya", "Qty", "Debit", "Kredit", "Jumlah"];

    function drawRow(cells: string[], opts: { bold?: boolean; color?: string } = {}) {
      const y = doc.y;
      doc.fontSize(8).font(opts.bold ? "Helvetica-Bold" : "Helvetica").fillColor(opts.color ?? "#111111");
      cells.forEach((cell, i) => {
        doc.text(cell, colX[i], y, { width: colW[i], align: i >= 5 ? "right" : "left" });
      });
      doc.moveDown(0.6);
    }

    drawRow(headers, { bold: true, color: "#555555" });
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.3);

    if (payslip.rows.length === 0) {
      doc.fontSize(9).fillColor("#888888").text("Belum ada rincian bulan ini.", 48);
      doc.moveDown(0.5);
    }
    for (const r of payslip.rows) {
      drawRow([
        String(r.no),
        r.date ?? "—",
        r.description,
        r.category ?? "—",
        r.qty ?? "—",
        r.debit > 0 ? fmtRp(r.debit) : "—",
        r.credit > 0 ? fmtRp(r.credit) : "—",
        fmtRp(r.balance),
      ]);
    }

    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#8a6d1f").stroke();
    doc.moveDown(0.4);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#8a6d1f").text("TOTAL PAYROLL", 48, doc.y, { continued: true, width: 300 });
    doc.fontSize(14).fillColor("#111111").text(fmtRp(payslip.total), { align: "right" });
    doc.moveDown(0.8);

    if (payslip.savings.length > 0) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#8a6d1f").text("CATATAN TABUNGAN", { characterSpacing: 1 });
      doc.moveDown(0.3);
      for (const s of payslip.savings) {
        doc.fontSize(9).font("Helvetica").fillColor("#111111").text(`${s.date} — ${fmtRp(s.amount)}${s.note ? ` (${s.note})` : ""}`);
      }
    }

    doc.end();
  });
}
