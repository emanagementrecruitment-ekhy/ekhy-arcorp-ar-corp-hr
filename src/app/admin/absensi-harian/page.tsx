"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BulkImportAbsensi from "@/components/admin/BulkImportAbsensi";

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
  todayDay: number | null;
  isFutureMonth: boolean;
  totalRegistered: number;
  totalVcrThisMonthLabel: string;
  avgPercentHadir: number;
  outlets: OutletGroup[];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AbsensiHarianPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<Dashboard | null>(null);
  const [canDelete, setCanDelete] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState("");
  const [manualDate, setManualDate] = useState(today());
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMsg, setManualMsg] = useState("");
  const [manualIsError, setManualIsError] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) =>
        setCanDelete(
          d.session?.accessRole === "OWNER" || d.session?.accessRole === "CONSULTANT" || d.session?.accessRole === "MANAGER"
        )
      );
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

  const allEmployees = (data?.outlets ?? []).flatMap((o) => o.employees);

  async function submitManual() {
    if (!manualEmployeeId) {
      setManualIsError(true);
      setManualMsg("Pilih karyawan/Tera dulu.");
      return;
    }
    setManualBusy(true);
    setManualMsg("");
    try {
      const res = await fetch("/api/admin/absensi/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: manualEmployeeId, dateKey: manualDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualIsError(true);
        setManualMsg(data.error ?? "Gagal menyimpan.");
        return;
      }
      setManualIsError(false);
      setManualMsg(data.alreadyMarked ? "Sudah tercatat sebelumnya." : "✓ Absen tersimpan.");
      load();
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Absensi Harian" subtitle="Self check-in karyawan/Tera per outlet, ditotal tiap bulan" />

      <div className="pt-5.5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">Bulan</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="py-2 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
            />
          </div>
          {canDelete && (
            <button
              onClick={() => setManualOpen((v) => !v)}
              className="py-2 px-3.5 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer"
            >
              + Tambah Absen Manual
            </button>
          )}
        </div>

        {canDelete && manualOpen && (
          <div className="mb-4 p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl">
            <div className="font-display text-[16px] text-ar-gold2 mb-3">Tambah Absen Manual</div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <div>
                <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Karyawan/Tera</label>
                <select
                  value={manualEmployeeId}
                  onChange={(e) => setManualEmployeeId(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                >
                  <option value="">Pilih karyawan/Tera…</option>
                  {allEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Tanggal</label>
                <input
                  type="date"
                  value={manualDate}
                  max={today()}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
                />
              </div>
              <button
                disabled={manualBusy}
                onClick={submitManual}
                className="py-2.5 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {manualBusy ? "Menyimpan…" : "Tandai Hadir"}
              </button>
            </div>
            {manualMsg && (
              <div className={`mt-3 text-[11.5px] ${manualIsError ? "text-ar-red" : "text-ar-green"}`}>{manualMsg}</div>
            )}
          </div>
        )}

        {canDelete && <BulkImportAbsensi onImported={load} />}

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
                              const dayNum = i + 1;
                              // A day only counts as "genuinely absent" once it's actually
                              // over — today and any day after it just haven't happened yet.
                              const isDecided =
                                !data.isFutureMonth && (data.todayDay === null || dayNum < data.todayDay);
                              const isAbsent = isDecided && !present;
                              const box = (
                                <span
                                  className={`inline-block w-3.5 h-3.5 rounded-[3px] border ${
                                    present
                                      ? "bg-ar-gold2 border-ar-gold2"
                                      : isAbsent
                                        ? "bg-ar-red/25 border-ar-red"
                                        : "border-ar-line"
                                  }`}
                                  title={isAbsent ? "Tidak absen" : undefined}
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
