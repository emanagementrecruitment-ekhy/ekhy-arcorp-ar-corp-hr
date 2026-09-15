"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface EmployeeRow {
  id: string;
  name: string;
  code: string;
  role: string;
  isTera: boolean;
  days: boolean[];
  dayIds: (string | null)[];
  hariHadir: number;
  persenHadir: number;
}

interface OutletGroup {
  place: string;
  employees: EmployeeRow[];
}

interface Dashboard {
  month: string;
  monthLabel: string;
  daysInMonth: number;
  trackingStarted: boolean;
  totalRegistered: number;
  totalVcrThisMonthLabel: string;
  avgPercentHadir: number;
  outlets: OutletGroup[];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AbsensiHarianPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Dashboard | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCanDelete(d.session?.accessRole === "OWNER" || d.session?.accessRole === "CONSULTANT"));
  }, []);

  function load() {
    fetch(`/api/admin/absensi?month=${month}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d));
  }

  useEffect(load, [month]);

  async function deleteMark(id: string) {
    if (!confirm("Hapus catatan absensi hari ini untuk karyawan/Tera ini?")) return;
    const res = await fetch(`/api/admin/absensi/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <AdminPageHeader title="Absensi Harian" subtitle="Self check-in karyawan/Tera per outlet, ditotal tiap bulan" />

      <div className="pt-5.5">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">Bulan</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="py-2 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
          />
        </div>

        {!data && <div className="text-[12px] text-ar-faint py-6 text-center">Memuat…</div>}

        {data && !data.trackingStarted && (
          <div className="p-4 bg-ar-goldfill border border-ar-goldline rounded-xl text-[12px] text-ar-dim mb-4">
            Absensi kotak centang belum berjalan di bulan ini — fitur baru mulai mencatat sejak September 2026.
          </div>
        )}

        {data && (
          <>
            <div className="grid gap-3.5 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl">
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Total Terdaftar</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.totalRegistered}</div>
              </div>
              <div className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl">
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Total VCR Bulan Ini</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.totalVcrThisMonthLabel}</div>
              </div>
              <div className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl">
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Rata-rata % Hadir</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.avgPercentHadir}%</div>
              </div>
              <div className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl">
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Jumlah Hari Kalender</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.daysInMonth}</div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {data.outlets.length === 0 && (
                <div className="p-8 bg-ar-surface border border-ar-line rounded-2xl text-center text-[12.5px] text-ar-faint">
                  Belum ada karyawan/Tera terdaftar.
                </div>
              )}
              {data.outlets.map((o) => (
                <div key={o.place} className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
                  <div className="text-[13px] font-display text-ar-gold2 mb-3">
                    {o.place} <span className="text-ar-dim text-[11px]">({o.employees.length} orang)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="border-collapse text-[11px]">
                      <thead>
                        <tr>
                          <th className="text-left py-1.5 pr-3 font-normal text-ar-dim sticky left-0 bg-ar-surface">Nama</th>
                          {Array.from({ length: data.daysInMonth }, (_, i) => (
                            <th key={i} className="w-6 text-center font-normal text-ar-faint text-[9.5px]">
                              {i + 1}
                            </th>
                          ))}
                          <th className="text-right py-1.5 pl-3 font-normal text-ar-dim">Hadir</th>
                          <th className="text-right py-1.5 pl-2 font-normal text-ar-dim">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.employees.map((e) => (
                          <tr key={e.id} className="border-t border-ar-line/60">
                            <td className="py-1.5 pr-3 sticky left-0 bg-ar-surface whitespace-nowrap">
                              {e.name} <span className="text-ar-faint">({e.isTera ? "Tera" : e.role})</span>
                            </td>
                            {e.days.map((present, i) => {
                              const id = e.dayIds[i];
                              const box = (
                                <span
                                  className={`inline-block w-3.5 h-3.5 rounded-[3px] border ${
                                    present ? "bg-ar-gold2 border-ar-gold2" : "border-ar-line"
                                  }`}
                                />
                              );
                              return (
                                <td key={i} className="text-center">
                                  {present && canDelete && id ? (
                                    <button
                                      onClick={() => deleteMark(id)}
                                      title="Hapus centang hari ini"
                                      className="cursor-pointer"
                                    >
                                      {box}
                                    </button>
                                  ) : (
                                    box
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-right pl-3 font-display text-ar-gold2">{e.hariHadir}</td>
                            <td className="text-right pl-2 text-ar-dim">{e.persenHadir}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
