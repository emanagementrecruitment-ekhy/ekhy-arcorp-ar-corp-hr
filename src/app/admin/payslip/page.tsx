"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PayslipDocument from "@/components/PayslipDocument";
import type { Payslip } from "@/lib/payslip";

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
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

  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("");
  const [kind, setKind] = useState<"debit" | "credit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/employees?pageSize=500")
      .then((r) => r.json())
      .then((d) => setEmployees((d.employees ?? []).map((e: EmployeeOption) => ({ id: e.id, name: e.name, code: e.code }))));
  }, []);

  function load() {
    if (!employeeId) return;
    fetch(`/api/admin/payslip?employeeId=${employeeId}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setPayslip(d.error ? null : d));
  }

  useEffect(load, [employeeId, month]);

  function resetForm() {
    setDate(today());
    setDescription("");
    setQty("");
    setAmount("");
    setNote("");
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
      const res = await fetch("/api/admin/payslip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month,
          date,
          description,
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
    if (res.ok) setPayslip(data.payslip);
  }

  return (
    <div>
      <AdminPageHeader
        title="Rincian Totalan"
        subtitle="Slip Pay per karyawan/Tera per bulan — VCR & Kasbon otomatis, sisanya diisi manual"
      />

      <div className="pt-5.5 grid grid-cols-1 lg:[grid-template-columns:1fr_1.4fr] gap-4">
        <div className="flex flex-col gap-4">
          <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
            <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Karyawan/Tera</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full py-2.5 px-3.5 mb-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
            >
              <option value="">Pilih karyawan…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code})
                </option>
              ))}
            </select>

            <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Bulan</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
            />
          </div>

          {employeeId && (
            <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
              <div className="font-display text-[17px] text-ar-gold2 mb-3.5">Tambah Rincian Manual</div>
              <div className="grid gap-3">
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Tanggal</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Rincian</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="cth. Admin, Mess, Ambil Barang - Seragam"
                    className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Qty (opsional)</label>
                    <input
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="cth. 1 Pcs"
                      className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Jenis</label>
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as "debit" | "credit")}
                      className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
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
                    className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Keterangan (opsional)</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                  />
                </div>
              </div>
              {msg && <div className="mt-3 text-[11.5px] text-ar-red">{msg}</div>}
              <button
                disabled={busy}
                onClick={submitItem}
                className="mt-3.5 w-full py-2.5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
              >
                Tambah Rincian
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
              <button
                onClick={() => window.print()}
                className="self-end py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
              >
                Print / Simpan PDF
              </button>
              <PayslipDocument payslip={payslip} onDeleteItem={deleteItem} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
