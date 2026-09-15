"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AddEmployeeForm from "@/components/admin/AddEmployeeForm";

interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export default function TambahKaryawanPage() {
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [lastCreated, setLastCreated] = useState<string | null>(null);

  function loadSupervisors() {
    fetch("/api/admin/employees?pageSize=500")
      .then((r) => r.json())
      .then((d) =>
        setSupervisors(
          (d.employees ?? [])
            .filter((e: { role: string }) => e.role === "Kepala Mess")
            .map((e: SupervisorOption) => ({ id: e.id, name: e.name, code: e.code }))
        )
      );
  }

  useEffect(loadSupervisors, []);

  return (
    <div>
      <AdminPageHeader title="Tambah Karyawan" subtitle="Karyawan baru otomatis masuk ke Data Karyawan, Tera baru otomatis masuk ke Data Tera" />

      <div className="pt-5.5 max-w-xl">
        <AddEmployeeForm
          supervisors={supervisors}
          onCreated={(code) => {
            setLastCreated(code);
            loadSupervisors();
          }}
        />

        {lastCreated && (
          <div className="mt-3.5 p-4 bg-ar-goldfill border border-ar-goldline rounded-2xl text-[12.5px] text-ar-gold2 flex items-center justify-between gap-3">
            <span>✓ {lastCreated} berhasil ditambahkan.</span>
            <span className="flex gap-3 whitespace-nowrap">
              <Link href="/admin/karyawan/tera" className="text-ar-gold underline">
                Lihat Data Tera
              </Link>
              <Link href="/admin/karyawan" className="text-ar-gold underline">
                Lihat Data Karyawan
              </Link>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
