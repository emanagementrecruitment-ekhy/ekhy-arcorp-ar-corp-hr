"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BulkImportAbsensi from "@/components/admin/BulkImportAbsensi";
import { btnPrimaryClass, cardClass, cardCompactClass, inputClass } from "@/components/ui/styles";
import { ATTENDANCE_CODES, TONE_CLASS, toneForMark } from "@/lib/attendance-codes";

interface EmployeeRow {
  id: string;
  name: string;
  code: string;
  role: string;
  isTera: boolean;
  days: boolean[];
  dayIds: (string | null)[];
  dayCodes: (string | null)[];
  dayManual: boolean[];
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

/** Last 12 months up to and including the current one, newest first. */
function monthOptions() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const value = d.toISOString().slice(0, 7);
    out.push({ value, label: d.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }) });
  }
  return out;
}

// Colour buttons the admin presses; the chosen one "paints" the cells that are clicked next.
const BRUSHES: { code: "M" | "O" | "J" | "P" | "S"; cls: string; name: string }[] = [
  { code: "M", cls: TONE_CLASS.red, name: "Merah" },
  { code: "O", cls: TONE_CLASS.yellow, name: "Kuning" },
  { code: "P", cls: TONE_CLASS.green, name: "Hijau" },
  { code: "S", cls: TONE_CLASS.blue, name: "Biru" },
  { code: "J", cls: TONE_CLASS.orange, name: "Jingga (input manual Admin)" },
];

function DayCell({
  toneCls,
  editable,
  absent,
  title,
  onPress,
}: {
  toneCls: string;
  editable: boolean;
  absent: boolean;
  title?: string;
  onPress: () => void;
}) {
  const look = toneCls || (absent ? "bg-ar-red/25 border-ar-red" : "border-ar-line bg-transparent");
  const cls = `inline-block w-5 h-5 rounded-[3px] border align-middle ${look}`;
  if (!editable) return <span className={cls} title={title} />;
  return (
    <button type="button" onClick={onPress} title={title} aria-label={title ?? "Isi absensi"} className={`${cls} cursor-pointer hover:ring-2 hover:ring-ar-gold`} />
  );
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

  const [cellMsg, setCellMsg] = useState("");
  const [brush, setBrush] = useState<string | null>(null); // code to paint, "" = eraser, null = nothing chosen

  async function commitCell(employeeId: string, day: number, code: string) {
    const dateKey = `${month}-${String(day).padStart(2, "0")}`;
    setCellMsg("");
    const res = await fetch("/api/admin/absensi/cell", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, dateKey, code }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setCellMsg(d.error ?? "Gagal menyimpan kode.");
    }
    load();
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
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="py-2 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px] capitalize"
            >
              {(monthOptions().some((o) => o.value === month) ? monthOptions() : [{ value: month, label: month }, ...monthOptions()]).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
                  className={inputClass}
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
                className={`${btnPrimaryClass} py-2.5 px-5 whitespace-nowrap`}
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
              <div className={cardCompactClass}>
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Total Terdaftar</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.totalRegistered}</div>
              </div>
              <div className={cardCompactClass}>
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Total VCR Bulan Ini</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.totalVcrThisMonthLabel}</div>
              </div>
              <div className={cardCompactClass}>
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Rata-rata % Hadir</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.avgPercentHadir}%</div>
              </div>
              <div className={cardCompactClass}>
                <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">Jumlah Hari Kalender</div>
                <div className="font-display text-[28px] text-ar-gold2 mt-1.5">{data.daysInMonth}</div>
              </div>
            </div>

            <div className="mb-4 p-3.5 bg-ar-surface border border-ar-line rounded-2xl text-[11px] text-ar-dim">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {BRUSHES.map((l) => {
                  const active = brush === l.code;
                  const body = (
                    <>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-[3px] border text-[10px] font-bold ${l.cls}`}>{l.code}</span>
                      {l.code} = {l.name}
                    </>
                  );
                  return canDelete ? (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setBrush(active ? null : l.code)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-[8px] border cursor-pointer ${
                        active ? "border-ar-gold bg-ar-goldfill text-ar-text" : "border-ar-line"
                      }`}
                    >
                      {body}
                    </button>
                  ) : (
                    <span key={l.code} className="inline-flex items-center gap-1.5">
                      {body}
                    </span>
                  );
                })}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setBrush(brush === "" ? null : "")}
                    aria-pressed={brush === ""}
                    className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-[8px] border cursor-pointer ${
                      brush === "" ? "border-ar-gold bg-ar-goldfill text-ar-text" : "border-ar-line"
                    }`}
                  >
                    ✕ Hapus warna
                  </button>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[3px] border bg-ar-gold2 border-ar-gold2" /> Emas = absen sendiri (karyawan)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-[3px] border bg-ar-red/25 border-ar-red" /> Merah muda = tidak absen
                </span>
              </div>
              {canDelete && (
                <div className="mt-2 text-ar-faint">
                  {brush === null
                    ? "Tekan salah satu tombol warna di atas, lalu klik kotak absensi yang ingin diwarnai. Klik lagi dengan warna yang sama untuk mengosongkan."
                    : brush === ""
                      ? "Mode hapus: klik kotak untuk mengosongkan warnanya."
                      : `Warna ${brush} aktif: klik kotak absensi untuk mewarnai.`}
                </div>
              )}
              {cellMsg && <div className="mt-2 text-ar-red">{cellMsg}</div>}
            </div>

            <div className="flex flex-col gap-4">
              {data.outlets.length === 0 && (
                <div className="p-8 bg-ar-surface border border-ar-line rounded-2xl text-center text-[12.5px] text-ar-faint">
                  Belum ada karyawan/Tera terdaftar.
                </div>
              )}
              {data.outlets.map((o) => (
                <div key={o.place} className={cardClass}>
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
                              const dayNum = i + 1;
                              // A day only counts as "genuinely absent" once it's actually
                              // over — today and any day after it just haven't happened yet.
                              const isDecided =
                                !data.isFutureMonth && (data.todayDay === null || dayNum < data.todayDay);
                              const isAbsent = isDecided && !present;
                              const code = e.dayCodes[i];
                              const tone = present ? toneForMark(code, e.dayManual[i]) : null;
                              const toneCls = tone ? TONE_CLASS[tone] : present ? "bg-ar-gold2 border-ar-gold2" : "";
                              const isFuture = data.isFutureMonth || (data.todayDay !== null && dayNum > data.todayDay);
                              const shown = code && code in ATTENDANCE_CODES ? code : null;
                              return (
                                <td key={i} className="text-center px-px py-0.5">
                                  <DayCell
                                    toneCls={toneCls}
                                    editable={canDelete && !isFuture && brush !== null}
                                    absent={isAbsent}
                                    title={shown ? `Kode ${shown}` : present ? "Absen" : undefined}
                                    onPress={() => commitCell(e.id, dayNum, brush === shown ? "" : (brush ?? ""))}
                                  />
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
