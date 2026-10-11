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
    const doc = new PDFDocument({ size: "A4", margin: 36 });
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

    // Excel-style Rincian Payroll grid — see payslip-sheet.ts for how the rows are laid out.
    const W = [18, 36, 58, 70, 28, 40, 48, 40, 48, 56, 42]; // No,Tgl,Blok,Rincian,Qty,DebJml,DebTot,KreJml,KreTot,Jumlah,Ket
    const X: number[] = [];
    W.reduce((x, w, i) => ((X[i] = x), x + w), 36);
    const right = 36 + W.reduce((a, b) => a + b, 0);
    const RH = 10.4;
    const num = (n: number | null) => (n ? (n < 0 ? `(${Math.abs(Math.round(n)).toLocaleString("id-ID")})` : Math.round(n).toLocaleString("id-ID")) : "");
    const cellText = (t: string, i: number, y: number, align: "left" | "right" | "center" = "left", span = 1, wrap = false) => {
      const w = W.slice(i, i + span).reduce((a, b) => a + b, 0);
      doc.text(t, X[i] + 2, y + 2.4, { width: w - 4, align, lineBreak: wrap, height: wrap ? RH * 3 : RH });
    };
    const box = (i: number, y: number, h: number, span = 1) => {
      const w = W.slice(i, i + span).reduce((a, b) => a + b, 0);
      doc.rect(X[i], y, w, h).lineWidth(0.4).strokeColor("#222222").stroke();
    };

    // Header (two bands)
    let y = doc.y;
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#111111");
    for (const [i, t, span] of [[0, "No", 1], [1, "Tanggal", 1], [2, "Rincian", 2], [4, "Qty", 1], [9, "Jumlah Totalan", 1], [10, "Keterangan", 1]] as Array<[number, string, number]>) {
      box(i, y, RH * 2, span);
      cellText(t, i, y + RH * 0.5, "center", span);
    }
    for (const [i, t] of [[5, "Debit"], [7, "Kredit"]] as Array<[number, string]>) {
      box(i, y, RH, 2);
      cellText(t, i, y, "center", 2);
    }
    for (const [i, t] of [[5, "Jumlah"], [6, "Total"], [7, "Jumlah"], [8, "Total"]] as Array<[number, string]>) {
      box(i, y + RH, RH);
      cellText(t, i, y + RH, "center");
    }
    y += RH * 2;

    doc.fontSize(6.5).font("Helvetica");
    for (const r of payslip.sheet) {
      const isTop = r.blockSpan === 1 && r.blockLabel === null;
      doc.fillColor("#111111");
      box(0, y, RH); cellText(String(r.no), 0, y, "center");
      box(1, y, RH); cellText(r.date ?? "", 1, y);
      if (isTop) {
        box(2, y, RH, 2); cellText(r.description, 2, y, "left", 2);
      } else {
        if (r.blockSpan > 0) {
          box(2, y, RH * r.blockSpan);
          doc.font("Helvetica-Bold");
          cellText(r.blockLabel ?? "", 2, y + (RH * (r.blockSpan - 1)) / 2 - (r.blockLabel && r.blockLabel.length > 10 ? 4 : 0), "center", 1, true);
          doc.font("Helvetica");
        }
        box(3, y, RH); cellText(r.description, 3, y);
      }
      box(4, y, RH); cellText(r.qty ?? "", 4, y, "center");
      box(5, y, RH); cellText(num(r.debitUnit), 5, y, "right");
      box(6, y, RH); cellText(num(r.debitTotal), 6, y, "right");
      box(7, y, RH); cellText(num(r.creditUnit), 7, y, "right");
      if (isTop) {
        box(8, y, RH); cellText(num(r.creditTotal), 8, y, "right");
      } else if (r.blockSpan > 0) {
        box(8, y, RH * r.blockSpan); cellText(num(r.creditTotal), 8, y + (RH * (r.blockSpan - 1)) / 2, "right");
      }
      box(9, y, RH); cellText(num(r.balance), 9, y, "right");
      box(10, y, RH); cellText(r.note ?? "", 10, y);
      y += RH;
    }
    doc.y = y + 4;
    doc.x = 36;

    doc.moveTo(36, doc.y).lineTo(right, doc.y).strokeColor("#8a6d1f").stroke();
    doc.moveDown(0.4);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#8a6d1f").text("TOTAL PAYROLL", 36, doc.y, { continued: true, width: right - 36 });
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
