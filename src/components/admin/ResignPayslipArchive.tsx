"use client";

import { useEffect, useState } from "react";

interface ArchiveItem {
  id: string;
  month: string;
  monthLabel: string;
  filename: string;
  createdAt: string;
  employee: { name: string; code: string; role: string; place: string; status: "AKTIF" | "RESIGN" };
}

export default function ResignPayslipArchive() {
  const [items, setItems] = useState<ArchiveItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/resign-payslip")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, []);

  if (items === null) return <div className="text-[12.5px] text-ar-faint">Memuat…</div>;

  if (items.length === 0) {
    return (
      <div className="py-8 px-4.5 bg-ar-surface border border-ar-line rounded-2xl text-center text-[12.5px] text-ar-faint">
        Belum ada slip resign yang tersimpan.
      </div>
    );
  }

  return (
    <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-x-auto">
      <div className="min-w-[640px]">
        <div
          className="grid gap-3 py-3.5 px-4.5 bg-ar-surface2 text-[10px] tracking-[0.14em] uppercase text-ar-dim"
          style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto" }}
        >
          <span>Karyawan</span>
          <span>Bulan Slip</span>
          <span>Status Sekarang</span>
          <span>Diarsipkan</span>
          <span>Aksi</span>
        </div>
        {items.map((it) => (
          <div
            key={it.id}
            className="grid gap-3 py-3.5 px-4.5 border-t border-ar-line text-[12.5px] items-center"
            style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto" }}
          >
            <span>
              <span className="block">{it.employee.name}</span>
              <span className="block text-[10.5px] text-ar-dim mt-1">
                {it.employee.code} · {it.employee.role} · {it.employee.place}
              </span>
            </span>
            <span>{it.monthLabel}</span>
            <span className={it.employee.status === "RESIGN" ? "text-ar-red" : "text-ar-green"}>
              {it.employee.status === "RESIGN" ? "Resign" : "Aktif kembali"}
            </span>
            <span className="text-[11px] text-ar-dim">{new Date(it.createdAt).toLocaleDateString("id-ID")}</span>
            <a
              href={`/api/admin/resign-payslip/${it.id}`}
              className="text-[11px] text-ar-gold cursor-pointer whitespace-nowrap"
            >
              Unduh PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
