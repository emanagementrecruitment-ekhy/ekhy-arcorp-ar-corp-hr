import "server-only";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { FIXED_BLUE_LABELS } from "./payslip-sheet";
import { HQ_ADDRESS, OFFICE2_ADDRESS } from "./constants";
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

    // E-MANAGEMENT watermark behind everything (kept in the PDF so a copy still carries it).
    try {
      const wm = fs.readFileSync(path.join(process.cwd(), "public", "watermark-emanagement.png"));
      const size = 330;
      doc.save();
      doc.opacity(0.09);
      doc.image(wm, (doc.page.width - size) / 2, (doc.page.height - size) / 2, { width: size });
      doc.restore();
    } catch {
      // watermark file missing: still produce the slip
    }

    // Karyawan (non-Tera): the "Slip Gaji Karyawan" format — identity left, earnings/deductions right.
    if (payslip.karyawan) {
      const k = payslip.karyawan;
      const e = payslip.employee;
      const nm = (n: number) => (n ? (n < 0 ? `(${Math.abs(Math.round(n)).toLocaleString("id-ID")})` : Math.round(n).toLocaleString("id-ID")) : "-");
      doc.fontSize(9).fillColor("#8a6d1f").font("Helvetica-Bold").text("AR CORP", { characterSpacing: 2 });
      doc.fontSize(20).fillColor("#111111").text("SLIP PAY KARYAWAN");
      doc.fontSize(9).font("Helvetica").fillColor("#555555").text(`REGISTER : ${k.register}`);
      const y0 = doc.y + 18;
      const left: Array<[string, string]> = [["NAMA", e.name], ["NIK", e.nik || "-"], ["BULAN", payslip.monthLabel.toUpperCase()], ["HP", e.phone || "-"], ["EMAIL", e.email || "-"]];
      doc.fontSize(10).fillColor("#111111");
      left.forEach(([l, v], i) => {
        doc.font("Helvetica").text(l, 36, y0 + i * 18, { width: 50 });
        doc.text(":", 88, y0 + i * 18);
        doc.font("Helvetica-Bold").text(v, 98, y0 + i * 18, { width: 200 });
      });
      const rows: Array<[string, number | null, boolean]> = [
        ["GAJI POKOK", k.gajiPokok, true], ["BONUS", k.bonus, false], ["Tunjangan", k.tunjangan, false],
        [`- - FEE VCR${k.feeVcrQty ? ` ${nm(k.feeVcrRate)} X ${k.feeVcrQty} =` : ""}`, k.feeVcr, false], ["- - FEE TRANSPORT", k.feeTransport, false],
        ["POTONGAN", null, true], ["- SISA KASBON", k.kasbon, false], ["- DENDA ABSEN", k.denda, false],
        ["- POTONGAN TERLAMBAT", k.terlambat, false], ["- LAIN LAIN", k.lain, false],
      ];
      rows.forEach(([l, v, bold], i) => {
        const yy = y0 + i * 16;
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#111111").text(l, 300, yy, { width: 160, lineBreak: false });
        if (v !== null) doc.font("Helvetica").fontSize(10).text(nm(v), 450, yy, { width: 108, align: "right" });
      });
      const yt = y0 + rows.length * 16 + 8;
      doc.moveTo(320, yt - 3).lineTo(558, yt - 3).lineWidth(0.6).strokeColor("#8a6d1f").stroke();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("SISA DAN TOTAL GAJI", 320, yt, { width: 130 });
      doc.fillColor(k.total < 0 ? "#dc2626" : "#111111").text(`Rp ${nm(k.total)}`, 430, yt, { width: 128, align: "right" });
      const yn = Math.max(yt, y0 + left.length * 18) + 50;
      doc.fillColor("#111111").font("Helvetica-Bold").fontSize(9).text("NOTE :", 36, yn);
      if (k.note) doc.font("Helvetica").fontSize(9).text(k.note, 36, yn + 14, { width: 250, height: 70 });
      doc.font("Helvetica").fontSize(9).text("Dibuat Oleh,", 380, yn, { width: 150, align: "center" });
      doc.fontSize(8).fillColor("#555555").text(HQ_ADDRESS, 36, yn + 90, { width: 523 });
      doc.text(OFFICE2_ADDRESS, 36, doc.y + 2, { width: 523 });
      doc.end();
      return;
    }

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
    const daily = payslip.daily;
    const nd = daily ? daily.columns.length : 0;
    // No,Tgl, [Hari, counts...], Blok,Rincian,Qty,DebJml,DebTot,KreJml,KreTot,Jumlah,Ket
    const W = daily
      ? [16, 30, 42, ...daily.columns.map(() => 15), 48, 58, 22, 32, 42, 32, 42, 48, 34]
      : [18, 36, 58, 70, 28, 40, 48, 40, 48, 56, 42];
    const X: number[] = [];
    W.reduce((x, w, i) => ((X[i] = x), x + w), 36);
    // Column offsets after the optional daily block.
    const cBlok = 2 + (daily ? 1 + nd : 0);
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
    const I = { no: 0, tgl: 1, hari: 2, cnt: 3, blok: cBlok, rinc: cBlok + 1, qty: cBlok + 2, dj: cBlok + 3, dt: cBlok + 4, kj: cBlok + 5, kt: cBlok + 6, jml: cBlok + 7, ket: cBlok + 8 };
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#111111");
    const heads: Array<[number, string, number]> = [[I.no, "No", 1], [I.tgl, "Tanggal", 1], [I.blok, "Rincian", 2], [I.qty, "Qty", 1], [I.jml, "Jumlah Totalan", 1], [I.ket, "Keterangan", 1]];
    for (const [i, t, span] of heads) {
      box(i, y, RH * 2, span);
      cellText(t, i, y + RH * 0.5, "center", span);
    }
    if (daily) {
      box(I.hari, y, RH, 1 + nd);
      cellText("Report", I.hari, y, "center", 1 + nd);
      box(I.hari, y + RH, RH);
      cellText("Hari", I.hari, y + RH, "center");
      daily.columns.forEach((c, k) => {
        box(I.cnt + k, y + RH, RH);
        cellText(c, I.cnt + k, y + RH, "center");
      });
    }
    for (const [i, t] of [[I.dj, "Debit"], [I.kj, "Kredit"]] as Array<[number, string]>) {
      box(i, y, RH, 2);
      cellText(t, i, y, "center", 2);
    }
    for (const [i, t] of [[I.dj, "Jumlah"], [I.dt, "Total"], [I.kj, "Jumlah"], [I.kt, "Total"]] as Array<[number, string]>) {
      box(i, y + RH, RH);
      cellText(t, i, y + RH, "center");
    }
    y += RH * 2;

    doc.fontSize(6.5).font("Helvetica");
    payslip.sheet.forEach((r, idx) => {
      const isTop = r.blockSpan === 1 && r.blockLabel === null;
      doc.fillColor("#111111");
      box(I.no, y, RH); cellText(String(r.no), I.no, y, "center");
      box(I.tgl, y, RH); cellText(r.date ?? "", I.tgl, y);
      if (daily) {
        const day = daily.days[idx];
        box(I.hari, y, RH); cellText(day ? day.label : "", I.hari, y);
        daily.columns.forEach((_, k) => {
          box(I.cnt + k, y, RH);
          cellText(day && day.counts[k] ? String(day.counts[k]) : "", I.cnt + k, y, "center");
        });
      }
      if (isTop) {
        const blue = FIXED_BLUE_LABELS.includes(r.description);
        box(I.blok, y, RH, 2);
        if (blue) doc.font("Helvetica-Bold").fillColor("#1d4ed8");
        cellText(r.description, I.blok, y, "left", 2);
        doc.font("Helvetica").fillColor("#111111");
      } else {
        if (r.blockSpan > 0) {
          box(I.blok, y, RH * r.blockSpan);
          doc.font("Helvetica-Bold");
          cellText(r.blockLabel ?? "", I.blok, y + (RH * (r.blockSpan - 1)) / 2 - (r.blockLabel && r.blockLabel.length > 10 ? 4 : 0), "center", 1, true);
          doc.font("Helvetica");
        }
        box(I.rinc, y, RH); cellText(r.description, I.rinc, y);
      }
      box(I.qty, y, RH); cellText(r.qty ?? "", I.qty, y, "center");
      box(I.dj, y, RH); cellText(num(r.debitUnit), I.dj, y, "right");
      box(I.dt, y, RH); cellText(num(r.debitTotal), I.dt, y, "right");
      box(I.kj, y, RH); cellText(num(r.creditUnit), I.kj, y, "right");
      if (isTop) {
        box(I.kt, y, RH); cellText(num(r.creditTotal), I.kt, y, "right");
      } else if (r.blockSpan > 0) {
        box(I.kt, y, RH * r.blockSpan); cellText(num(r.creditTotal), I.kt, y + (RH * (r.blockSpan - 1)) / 2, "right");
      }
      box(I.jml, y, RH);
      if (r.balance < 0) doc.fillColor("#dc2626");
      cellText(num(r.balance), I.jml, y, "right");
      doc.fillColor("#111111");
      box(I.ket, y, RH); cellText(r.note ?? "", I.ket, y);
      y += RH;
    });
    if (daily) {
      // Totals of the daily report under its columns.
      doc.font("Helvetica-Bold");
      box(I.hari, y, RH); cellText("TOTAL VCR", I.hari, y);
      daily.totals.forEach((t, k) => {
        box(I.cnt + k, y, RH);
        cellText(String(t), I.cnt + k, y, "center");
      });
      doc.font("Helvetica");
      y += RH;
    }    doc.y = y + 4;
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
