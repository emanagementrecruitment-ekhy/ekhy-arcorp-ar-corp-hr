"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AddEmployeeForm from "@/components/admin/AddEmployeeForm";

interface EmpRow {
  id: string;
  name: string;
  code: string;
  role: string;
  level: string;
  email: string;
  phone: string;
  count: string;
  kasbon: string;
  total: string;
}

export default function KaryawanPage() {
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  function load() {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((d) => setRows(d.employees ?? []));
  }

  useEffect(() => {
    load();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCanEdit(["OWNER", "CONSULTANT"].includes(d.session?.accessRole)));
  }, []);

  const cols = "1.6fr 1fr 1.5fr .9fr .9fr 1.1fr";

  return (
    <div>
      <AdminPageHeader title="Data Karyawan" subtitle={`${rows.length || 6} karyawan terdaftar · login dengan email atau nomor HP`} />

      <div className="pt-5.5">
        {canEdit && (
          <div className="flex justify-end mb-3.5">
            <AddEmployeeForm
              supervisors={rows.map((r) => ({ id: r.id, name: r.name, code: r.code }))}
              onCreated={load}
            />
          </div>
        )}

        <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-hidden">
          <div
            className="grid gap-3 py-3.5 px-4.5 bg-ar-surface2 text-[10px] tracking-[0.14em] uppercase text-ar-dim"
            style={{ gridTemplateColumns: cols }}
          >
            <span>Karyawan</span>
            <span>Level</span>
            <span>Kontak</span>
            <span>Voucher</span>
            <span>Kasbon</span>
            <span>Pendapatan 30 hari</span>
          </div>
          {rows.map((e) => (
            <div
              key={e.code}
              className="grid gap-3 py-3.5 px-4.5 border-t border-ar-line text-[12.5px] items-center"
              style={{ gridTemplateColumns: cols }}
            >
              <span>
                <span className="block">{e.name}</span>
                <span className="block text-[10.5px] text-ar-dim mt-1">
                  {e.code} · {e.role}
                </span>
              </span>
              <span className={e.level === "PLATINUM" ? "text-ar-gold2" : "text-ar-dim"}>
                {e.level === "PLATINUM" ? "Platinum" : "Silver"}
              </span>
              <span className="text-[11px] text-ar-dim leading-[1.6]">
                {e.email}
                <br />
                {e.phone}
              </span>
              <span>{e.count}</span>
              <span className={e.kasbon !== "—" ? "text-ar-red" : "text-ar-faint"}>{e.kasbon}</span>
              <span className="font-display text-[17px] text-ar-gold2">{e.total}</span>
            </div>
          ))}
        </div>
        <div className="mt-3.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          Hak akses: hanya <span className="text-ar-gold">Owner</span> dan <span className="text-ar-gold">Consultant</span> yang
          dapat mengubah data karyawan, nilai voucher, dan menyetujui kasbon. Admin pusat hanya melihat dan mengunduh laporan.
        </div>
      </div>
    </div>
  );
}
