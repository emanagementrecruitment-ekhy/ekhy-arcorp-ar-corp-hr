"use client";

import { cachedJson } from "@/lib/client-cache";
import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PayslipDocument from "@/components/PayslipDocument";
import type { Payslip } from "@/lib/payslip";
import { PAYSLIP_COST_CATEGORIES, usesVcr } from "@/lib/constants";
import { SHEET_BLOCK_CATEGORIES } from "@/lib/payslip-sheet";
import { downloadFile } from "@/lib/client-download";
import { describePayslipDelivery } from "@/lib/payslip-delivery-message";
import { btnPrimaryClass, cardClass, inputClass } from "@/components/ui/styles";

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
  role: string;
}

interface RecurringCost {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  startMonth: string;
  startMonthLabel: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminPayslipPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [payslip, setPayslip] = useState<Payslip | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("");
  const [block, setBlock] = useState(""); // "" = otomatis (by Rincian text), else one of SHEET_BLOCK_CATEGORIES
  const [kind, setKind] = useState<"debit" | "credit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [savingDate, setSavingDate] = useState(today());
  const [savingAmount, setSavingAmount] = useState("");
  const [savingNote, setSavingNote] = useState("");
  const [savingBusy, setSavingBusy] = useState(false);
  const [savingMsg, setSavingMsg] = useState("");

  const [recurringCosts, setRecurringCosts] = useState<RecurringCost[]>([]);
  const [rcCategory, setRcCategory] = useState("");
  const [rcAmount, setRcAmount] = useState("");
  const [rcNote, setRcNote] = useState("");
  const [rcStartMonth, setRcStartMonth] = useState(currentMonth());
  const [rcBusy, setRcBusy] = useState(false);
  const [rcMsg, setRcMsg] = useState("");
  const [rcEditingId, setRcEditingId] = useState<string | null>(null);
  const [rcEditAmount, setRcEditAmount] = useState("");
  const [rcEditNote, setRcEditNote] = useState("");

  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusMultiplier, setBonusMultiplier] = useState("1");
  const [bonusNote, setBonusNote] = useState("");
  const [bonusBusy, setBonusBusy] = useState(false);
  const [bonusMsg, setBonusMsg] = useState("");

  const [empFilter, setEmpFilter] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const isTera = selectedEmployee ? usesVcr(selectedEmployee.role) : false;

  useEffect(() => {
    cachedJson("/api/admin/employees?pageSize=500&lite=1")
      .then((d) =>
        setEmployees(
          (d.employees ?? []).map((e: EmployeeOption) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            role: e.role,
          }))
        )
      );
  }, []);

  function load() {
    if (!employeeId) return;
    fetch(`/api/admin/payslip?employeeId=${employeeId}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setPayslip(d.error ? null : d));
  }

  useEffect(load, [employeeId, month]);

  function loadRecurringCosts() {
    if (!employeeId) return;
    fetch(`/api/admin/recurring-costs?employeeId=${employeeId}`)
      .then((r) => r.json())
      .then((d) => setRecurringCosts(d.recurringCosts ?? []));
  }

  useEffect(loadRecurringCosts, [employeeId]);

  function resetForm() {
    setEditingId(null);
    setDate(today());
    setDescription("");
    setQty("");
    setBlock("");
    setNote("");
    setAmount("");
    setKind("credit");
  }

  function startEdit(id: string) {
    const row = payslip?.rows.find((r) => r.id === id);
    if (!row) return;
    setEditingId(id);
    setDate(row.dateRaw ?? today());
    setDescription(row.description);
    setQty(row.qty ?? "");
    setBlock((SHEET_BLOCK_CATEGORIES as readonly string[]).includes(row.category ?? "") ? (row.category as string) : "");
    setNote(row.note ?? "");
    setKind(row.credit > 0 ? "credit" : "debit");
    setAmount(String(row.credit > 0 ? row.credit : row.debit));
    setMsg("");
  }

  async function submitItem() {
    const num = Number(amount.replace(/[^0-9]/g, ""));
    if (!description.trim() || !num) {
      setMsg("Isi rincian dan nominal dulu.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(editingId ? `/api/admin/payslip/items/${editingId}` : "/api/admin/payslip", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month,
          date,
          description,
          category: block,
          qty,
          note,
          debit: kind === "debit" ? num : 0,
          credit: kind === "credit" ? num : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      resetForm();
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/admin/payslip/items/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setPayslip(data.payslip);
      if (editingId === id) resetForm();
    }
  }

  async function submitBonus() {
    const nominal = Number(bonusAmount.replace(/[^0-9]/g, ""));
    const kali = Math.max(1, Math.round(Number(bonusMultiplier)) || 1);
    if (!nominal) {
      setBonusMsg("Isi nominal Bonus dulu.");
      return;
    }
    setBonusBusy(true);
    setBonusMsg("");
    try {
      const res = await fetch("/api/admin/payslip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month,
          date: today(),
          description: "Bonus",
          qty: `${kali}x`,
          note: bonusNote,
          debit: nominal * kali,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBonusMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      setBonusAmount("");
      setBonusMultiplier("1");
      setBonusNote("");
    } finally {
      setBonusBusy(false);
    }
  }

  async function submitSaving() {
    const num = Number(savingAmount.replace(/[^0-9]/g, ""));
    if (!savingDate || !num) {
      setSavingMsg("Isi tanggal dan nominal Tabungan dulu.");
      return;
    }
    setSavingBusy(true);
    setSavingMsg("");
    try {
      const res = await fetch("/api/admin/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, date: savingDate, amount: num, note: savingNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSavingMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      setSavingDate(today());
      setSavingAmount("");
      setSavingNote("");
    } finally {
      setSavingBusy(false);
    }
  }

  async function deleteSaving(id: string) {
    const res = await fetch(`/api/admin/savings/${id}?month=${month}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setPayslip(data.payslip);
  }

  async function saveAsPdf() {
    setPdfBusy(true);
    try {
      await downloadFile(`/api/admin/payslip/pdf?employeeId=${employeeId}&month=${month}`, "Slip Pay.pdf");
    } finally {
      setPdfBusy(false);
    }
  }

  async function sendToContacts() {
    setSendBusy(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/admin/payslip/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month }),
      });
      const data = await res.json();
      setSendMsg(res.ok ? describePayslipDelivery(data) : data.error ?? "Gagal mengirim.");
    } finally {
      setSendBusy(false);
    }
  }

  async function submitRecurringCost() {
    const num = Number(rcAmount.replace(/[^0-9]/g, ""));
    if (!rcCategory || !num) {
      setRcMsg("Pilih kategori dan isi nominal dulu.");
      return;
    }
    setRcBusy(true);
    setRcMsg("");
    try {
      const res = await fetch("/api/admin/recurring-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, category: rcCategory, amount: num, note: rcNote, startMonth: rcStartMonth }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRcMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      if (rcStartMonth === month) setPayslip(data.payslip);
      setRcCategory("");
      setRcAmount("");
      setRcNote("");
      loadRecurringCosts();
      load();
    } finally {
      setRcBusy(false);
    }
  }

  function startEditRecurring(rc: RecurringCost) {
    setRcEditingId(rc.id);
    setRcEditAmount(String(rc.amount));
    setRcEditNote(rc.note ?? "");
  }

  async function saveEditRecurring(id: string) {
    const num = Number(rcEditAmount.replace(/[^0-9]/g, ""));
    if (!num) return;
    const res = await fetch(`/api/admin/recurring-costs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num, note: rcEditNote, month }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayslip(data.payslip);
      setRcEditingId(null);
      loadRecurringCosts();
    }
  }

  // MANUAL-level Tera: the per-voucher rate is typed here on the Slip Pay instead of on the Tera's profile.
  const [manualRateInput, setManualRateInput] = useState("");
  const [manualRateBusy, setManualRateBusy] = useState(false);
  const [manualRateMsg, setManualRateMsg] = useState("");
  useEffect(() => {
    setManualRateInput(payslip?.manualRate ? String(payslip.manualRate) : "");
    setManualRateMsg("");
  }, [payslip?.manualRate, employeeId, month]);

  async function saveManualRate() {
    setManualRateBusy(true);
    setManualRateMsg("");
    try {
      const res = await fetch("/api/admin/payslip/rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, rate: Number(manualRateInput) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualRateMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      setManualRateMsg("✓ Tersimpan.");
    } finally {
      setManualRateBusy(false);
    }
  }

  // TRAVEL / CLASSIC T5 Tera: edit the daily S / D voucher counts and nominal straight on the Slip Pay.
  const [vcrEdits, setVcrEdits] = useState<Record<string, string>>({}); // "YYYY-MM-DD|FL" -> typed count
  const [vcrRates, setVcrRates] = useState<{ FL: string; CLASSIC_D: string }>({ FL: "", CLASSIC_D: "" });
  const [vcrBusy, setVcrBusy] = useState(false);
  const [vcrMsg, setVcrMsg] = useState("");
  useEffect(() => {
    setVcrEdits({});
    setVcrMsg("");
    const unit = (label: string) => payslip?.sheet.find((r) => r.section === "VCR" && r.description === label)?.debitUnit;
    setVcrRates({ FL: unit("TOTAL VCR S") ? String(unit("TOTAL VCR S")) : "", CLASSIC_D: unit("TOTAL VCR D") ? String(unit("TOTAL VCR D")) : "" });
  }, [payslip, employeeId, month]);

  // Karyawan (non-Tera): edit the Slip Gaji lines directly.
  const [gajiEdit, setGajiEdit] = useState<Record<string, string>>({});
  const [gajiBusy, setGajiBusy] = useState(false);
  const [gajiMsg, setGajiMsg] = useState("");
  useEffect(() => {
    const k = payslip?.karyawan;
    setGajiMsg("");
    setGajiEdit(
      k
        ? {
            bonus: String(k.bonus), tunjangan: String(k.tunjangan), feeVcr: String(k.feeVcr), feeVcrQty: String(k.feeVcrQty),
            feeTransport: String(k.feeTransport), kasbon: String(k.kasbon), denda: String(k.denda), terlambat: String(k.terlambat), lain: String(k.lain),
          }
        : {},
    );
  }, [payslip, employeeId, month]);

  async function saveGaji() {
    setGajiBusy(true);
    setGajiMsg("");
    try {
      const lines: Record<string, number> = {};
      for (const [k, v] of Object.entries(gajiEdit)) lines[k] = Number(v.replace(/[^0-9]/g, "")) || 0;
      const res = await fetch("/api/admin/payslip/karyawan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, lines }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGajiMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      setGajiMsg(data.unchanged ? "Tidak ada perubahan." : "✓ Tersimpan, Slip Gaji dihitung ulang.");
    } finally {
      setGajiBusy(false);
    }
  }

  async function saveVcr() {
    if (!payslip?.daily) return;
    const cols = payslip.daily.columns;
    const cats = ["FL", "CLASSIC_D"] as const;
    const edits: Array<{ day: string; category: string; count: number }> = [];
    for (const [k, v] of Object.entries(vcrEdits)) {
      const [day, category] = k.split("|");
      const idx = cats.indexOf(category as (typeof cats)[number]);
      const current = payslip.daily.days.find((d) => d.key === day)?.counts[idx] ?? 0;
      const count = Math.max(0, Math.round(Number(v) || 0));
      if (idx >= 0 && cols[idx] && count !== current) edits.push({ day, category, count });
    }
    setVcrBusy(true);
    setVcrMsg("");
    try {
      const res = await fetch("/api/admin/payslip/vcr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, month, edits, rates: { FL: Number(vcrRates.FL) || 0, CLASSIC_D: Number(vcrRates.CLASSIC_D) || 0 } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVcrMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setPayslip(data.payslip);
      setVcrMsg(data.unchanged ? "Tidak ada perubahan." : "✓ Tersimpan, Slip Pay dihitung ulang.");
    } finally {
      setVcrBusy(false);
    }
  }

  async function deleteRecurring(id: string) {
    const res = await fetch(`/api/admin/recurring-costs/${id}?month=${month}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setPayslip(data.payslip);
      loadRecurringCosts();
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Rincian Totalan"
        subtitle="Slip Pay per karyawan/Tera per bulan — VCR & Kasbon otomatis, sisanya diisi manual"
      />

      <div className="pt-5.5 grid grid-cols-1 lg:[grid-template-columns:1fr_1.4fr] gap-4">
        <div className="flex flex-col gap-4">
          <div className={cardClass}>
            <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Karyawan/Tera</label>
            <input
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              placeholder="Ketik untuk mencari nama atau kode…"
              className="w-full py-2 px-3.5 mb-2 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12px]"
            />
            <select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                resetForm();
              }}
              className="w-full py-2.5 px-3.5 mb-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
            >
              <option value="">Pilih karyawan…</option>
              {employees
                .filter((e) => e.id === employeeId || !empFilter.trim() || `${e.name} ${e.code}`.toLowerCase().includes(empFilter.trim().toLowerCase()))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </option>
                ))}
            </select>

            {payslip && employeeId && (
              <div className="mb-3.5 p-3 bg-ar-surface2 border border-ar-line rounded-[10px] text-[11.5px] grid gap-1">
                <div className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-0.5">Terisi otomatis dari data karyawan</div>
                <div><span className="text-ar-dim">NIK</span> : {payslip.employee.nik || "—"}</div>
                <div><span className="text-ar-dim">No HP</span> : {payslip.employee.phone || "—"}</div>
                <div className="break-all"><span className="text-ar-dim">Email</span> : {payslip.employee.email || "—"}</div>
              </div>
            )}

            <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Bulan</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClass}
            />
          </div>

          {employeeId && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Bonus</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">
                Nominal × Kali dihitung otomatis dan langsung masuk ke Slip Pay bulan ini sebagai tambahan.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Nominal Bonus</label>
                  <input
                    value={bonusAmount ? Number(bonusAmount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                    onChange={(e) => setBonusAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Rp 0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Kali</label>
                  <input
                    type="number"
                    min={1}
                    value={bonusMultiplier}
                    onChange={(e) => setBonusMultiplier(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Keterangan (opsional)</label>
                <input
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  placeholder="cth. Bonus target bulan ini"
                  className={inputClass}
                />
              </div>
              {bonusAmount && (
                <div className="mt-3 text-[11.5px] text-ar-dim">
                  Total: <span className="text-ar-gold2 font-display">
                    Rp {(Number(bonusAmount.replace(/[^0-9]/g, "")) * Math.max(1, Math.round(Number(bonusMultiplier)) || 1)).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              {bonusMsg && <div className="mt-3 text-[11.5px] text-ar-red">{bonusMsg}</div>}
              <button
                disabled={bonusBusy}
                onClick={submitBonus}
                className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}
              >
                {bonusBusy ? "Menyimpan…" : "Tambah Bonus"}
              </button>
            </div>
          )}

          {employeeId && payslip?.karyawan && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Edit Slip Gaji Karyawan</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">
                Ketik nominal tiap baris untuk bulan ini. Gaji Pokok (Rp {payslip.karyawan.gajiPokok.toLocaleString("id-ID")}) mengikuti data karyawan lewat tombol Edit di Data Karyawan.
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["bonus", "Bonus"], ["tunjangan", "Tunjangan"], ["feeVcr", "Fee VCR (Rp)"], ["feeVcrQty", "Fee VCR jumlah (X)"],
                  ["feeTransport", "Fee Transport"], ["kasbon", "Sisa Kasbon"], ["denda", "Denda Absen"], ["terlambat", "Potongan Terlambat"], ["lain", "Lain-lain"],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">{label}</label>
                    <input
                      value={gajiEdit[key] && gajiEdit[key] !== "0" ? Number(gajiEdit[key].replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                      onChange={(e) => setGajiEdit((m) => ({ ...m, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder={key === "feeVcrQty" ? "0" : "Rp 0"}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              {gajiMsg && <div className={`mt-3 text-[11.5px] ${gajiMsg.startsWith("✓") || gajiMsg.startsWith("Tidak") ? "text-ar-green" : "text-ar-red"}`}>{gajiMsg}</div>}
              <button disabled={gajiBusy} onClick={saveGaji} className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}>
                {gajiBusy ? "Menyimpan…" : "Simpan Slip Gaji"}
              </button>
            </div>
          )}

          {employeeId && payslip?.variant === "TRAVEL" && payslip.daily && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Edit VCR (TRAVEL / CLASSIC T5)</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">
                Ubah jumlah VCR kategori S dan D per hari, atau nominal per VCR bulan ini. Slip Pay dihitung ulang otomatis dan perubahan tercatat di Riwayat Aktivitas.
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3.5">
                {([["FL", "Nominal S (Rp/VCR)"], ["CLASSIC_D", "Nominal D (Rp/VCR)"]] as const).map(([cat, label]) => (
                  <div key={cat}>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">{label}</label>
                    <input
                      value={vcrRates[cat] ? Number(vcrRates[cat].replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                      onChange={(e) => setVcrRates((r) => ({ ...r, [cat]: e.target.value.replace(/[^0-9]/g, "") }))}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <div className="max-h-[320px] overflow-y-auto border border-ar-line rounded-[10px]">
                <table className="w-full text-[11.5px] border-collapse">
                  <thead className="sticky top-0 bg-ar-surface2 text-[9.5px] tracking-[0.1em] uppercase text-ar-dim">
                    <tr>
                      <th className="py-1.5 px-2 text-left font-normal">Hari</th>
                      <th className="py-1.5 px-2 font-normal">S</th>
                      <th className="py-1.5 px-2 font-normal">D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslip.daily.days.map((d) => (
                      <tr key={d.key} className="border-t border-ar-line/60">
                        <td className="py-1 px-2 whitespace-nowrap">{d.label}</td>
                        {(["FL", "CLASSIC_D"] as const).map((cat, i) => {
                          const k = `${d.key}|${cat}`;
                          return (
                            <td key={cat} className="py-1 px-2 text-center">
                              <input
                                type="number"
                                min={0}
                                value={vcrEdits[k] ?? String(d.counts[i] ?? 0)}
                                onChange={(e) => setVcrEdits((m) => ({ ...m, [k]: e.target.value }))}
                                className="w-16 py-1 px-2 bg-ar-input border border-ar-goldline rounded-[8px] text-ar-text text-[12px] text-center"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {vcrMsg && <div className={`mt-3 text-[11.5px] ${vcrMsg.startsWith("✓") || vcrMsg.startsWith("Tidak") ? "text-ar-green" : "text-ar-red"}`}>{vcrMsg}</div>}
              <button disabled={vcrBusy} onClick={saveVcr} className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}>
                {vcrBusy ? "Menyimpan…" : "Simpan Perubahan VCR"}
              </button>
            </div>
          )}

          {employeeId && payslip?.employee.level === "MANUAL" && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Nominal MANUAL INPUT</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">
                Ketik nominal per VCR untuk bulan ini. TOTAL VCR di Slip Pay dihitung ulang: jumlah VCR × nominal. Kosongkan untuk kembali ke nominal bawaan.
              </div>
              <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Nominal per VCR (Rp)</label>
              <input
                value={manualRateInput ? Number(manualRateInput.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => setManualRateInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Rp 0"
                className={inputClass}
              />
              {manualRateMsg && (
                <div className={`mt-3 text-[11.5px] ${manualRateMsg.startsWith("✓") ? "text-ar-green" : "text-ar-red"}`}>{manualRateMsg}</div>
              )}
              <button disabled={manualRateBusy} onClick={saveManualRate} className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}>
                {manualRateBusy ? "Menyimpan…" : "Simpan Nominal"}
              </button>
            </div>
          )}

          {employeeId && isTera && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Penambahan Biaya (Berulang)</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">
                Dipilih sekali, otomatis tercatat di Slip Pay bulan ini dan setiap bulan berikutnya sampai diedit/dihapus.
              </div>

              {recurringCosts.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {recurringCosts.map((rc) => (
                    <div key={rc.id} className="p-3 bg-ar-surface2 border border-ar-line rounded-[10px]">
                      {rcEditingId === rc.id ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-[11.5px] text-ar-gold2">{rc.category}</div>
                          <input
                            value={rcEditAmount ? Number(rcEditAmount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                            onChange={(e) => setRcEditAmount(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="Rp 0"
                            className="w-full py-2 px-3 bg-ar-input border border-ar-goldline rounded-[8px] text-ar-text text-[12px]"
                          />
                          <input
                            value={rcEditNote}
                            onChange={(e) => setRcEditNote(e.target.value)}
                            placeholder="Keterangan (opsional)"
                            className="w-full py-2 px-3 bg-ar-input border border-ar-goldline rounded-[8px] text-ar-text text-[12px]"
                          />
                          <div className="flex gap-3">
                            <button onClick={() => saveEditRecurring(rc.id)} className="text-ar-gold text-[10.5px] cursor-pointer">
                              Simpan
                            </button>
                            <button onClick={() => setRcEditingId(null)} className="text-ar-dim text-[10.5px] cursor-pointer">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <div className="text-[12px] text-ar-text">{rc.category}</div>
                            <div className="text-[10.5px] text-ar-dim truncate">
                              Sejak {rc.startMonthLabel}
                              {rc.note ? ` · ${rc.note}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[12.5px] font-display text-ar-gold2">
                              Rp {rc.amount.toLocaleString("id-ID")}
                            </span>
                            <button onClick={() => startEditRecurring(rc)} className="text-ar-gold text-[10.5px] cursor-pointer">
                              Edit
                            </button>
                            <button onClick={() => deleteRecurring(rc.id)} className="text-ar-red text-[10.5px] cursor-pointer">
                              Hapus
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3">
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Kategori</label>
                  <select
                    value={rcCategory}
                    onChange={(e) => setRcCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pilih kategori…</option>
                    {PAYSLIP_COST_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Nominal/bulan</label>
                    <input
                      value={rcAmount ? Number(rcAmount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                      onChange={(e) => setRcAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Rp 0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Mulai Bulan</label>
                    <input
                      type="month"
                      value={rcStartMonth}
                      onChange={(e) => setRcStartMonth(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Keterangan (opsional)</label>
                  <input
                    value={rcNote}
                    onChange={(e) => setRcNote(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              {rcMsg && <div className="mt-3 text-[11.5px] text-ar-red">{rcMsg}</div>}
              <button
                disabled={rcBusy}
                onClick={submitRecurringCost}
                className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}
              >
                Tambah Penambahan Biaya
              </button>
            </div>
          )}

          {employeeId && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-3.5">
                {editingId ? "Edit Rincian" : "Tambah Rincian Manual"}
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Rincian</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="cth. Kasbon Uang, Ambil Barang - Seragam"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Masuk ke Blok</label>
                  <select value={block} onChange={(e) => setBlock(e.target.value)} className={inputClass}>
                    <option value="">Otomatis (sesuai Rincian)</option>
                    {SHEET_BLOCK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Qty (opsional)</label>
                    <input
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="cth. 1 Pcs"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Jenis</label>
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as "debit" | "credit")}
                      className={inputClass}
                    >
                      <option value="credit">Kredit (potongan)</option>
                      <option value="debit">Debit (tambahan)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Nominal</label>
                  <input
                    value={amount ? Number(amount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Rp 0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Keterangan (opsional)</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              {msg && <div className="mt-3 text-[11.5px] text-ar-red">{msg}</div>}
              <div className="flex gap-2.5 mt-3.5">
                <button
                  disabled={busy}
                  onClick={submitItem}
                  className={`${btnPrimaryClass} flex-1 py-2.5`}
                >
                  {editingId ? "Simpan Perubahan" : "Tambah Rincian"}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="py-2.5 px-4 bg-ar-surface2 border border-ar-line rounded-[10px] text-ar-dim text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          )}

          {employeeId && isTera && (
            <div className={cardClass}>
              <div className="font-display text-[17px] text-ar-gold2 mb-1">Tabungan</div>
              <div className="text-[10.5px] text-ar-dim mb-3.5">Catatan riwayat menabung — tidak memotong Total Payroll.</div>
              <div className="grid gap-3">
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Tanggal Menabung</label>
                  <input
                    type="date"
                    value={savingDate}
                    onChange={(e) => setSavingDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Nominal</label>
                  <input
                    value={savingAmount ? Number(savingAmount.replace(/[^0-9]/g, "")).toLocaleString("id-ID") : ""}
                    onChange={(e) => setSavingAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Rp 0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Keterangan (opsional)</label>
                  <input
                    value={savingNote}
                    onChange={(e) => setSavingNote(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              {savingMsg && <div className="mt-3 text-[11.5px] text-ar-red">{savingMsg}</div>}
              <button
                disabled={savingBusy}
                onClick={submitSaving}
                className={`${btnPrimaryClass} mt-3.5 w-full py-2.5`}
              >
                Tambah Tabungan
              </button>
            </div>
          )}
        </div>

        <div>
          {!employeeId && (
            <div className="p-8 bg-ar-surface border border-ar-line rounded-2xl text-center text-[12.5px] text-ar-faint">
              Pilih karyawan untuk melihat Slip Pay-nya.
            </div>
          )}
          {employeeId && !payslip && (
            <div className="p-8 bg-ar-surface border border-ar-line rounded-2xl text-center text-[12.5px] text-ar-faint">
              Memuat…
            </div>
          )}
          {employeeId && payslip && (
            <div className="flex flex-col gap-3">
              <div className="self-end flex flex-wrap justify-end gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
                >
                  Print
                </button>
                <button
                  disabled={pdfBusy}
                  onClick={saveAsPdf}
                  className={`${btnPrimaryClass} py-2.5 px-4`}
                >
                  {pdfBusy ? "Menyiapkan…" : "Simpan PDF"}
                </button>
                <button
                  disabled={sendBusy}
                  onClick={sendToContacts}
                  className="py-2.5 px-4 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
                >
                  {sendBusy ? "Mengirim…" : "Kirim Email/WA"}
                </button>
              </div>
              {sendMsg && <div className="self-end text-[11px] text-ar-dim text-right max-w-[360px]">{sendMsg}</div>}
              <PayslipDocument payslip={payslip} onDeleteItem={deleteItem} onEditItem={startEdit} onDeleteSaving={deleteSaving} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
