"use client";

import { useEffect, useState } from "react";

interface MonthData {
  totalDays: number;
  trackingStarted: boolean;
  markedDays: number[];
  todayDay: number | null;
  checkedInToday: boolean;
}

export default function AttendanceCheckin() {
  const [data, setData] = useState<MonthData | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/absensi/month")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }

  useEffect(load, []);

  async function checkIn() {
    setBusy(true);
    try {
      const res = await fetch("/api/absensi/checkin", { method: "POST" });
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  if (!data.trackingStarted) {
    return null; // feature not live yet for this calendar month — stay invisible rather than confusing
  }

  const marked = new Set(data.markedDays);

  return (
    <div className="bg-ar-surface border border-ar-line rounded-2xl p-[17px] mb-3.5">
      <div className="flex justify-between items-center gap-3 mb-3">
        <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim">Absensi Bulan Ini</div>
        <div className="text-[11px] text-ar-gold2 font-display">
          {data.markedDays.length}/{data.totalDays} hari
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {Array.from({ length: data.totalDays }, (_, i) => i + 1).map((day) => {
          const isToday = day === data.todayDay;
          const isPresent = marked.has(day);
          const isFuture = data.todayDay !== null && day > data.todayDay;
          return (
            <span
              key={day}
              className={`w-6 h-6 rounded-[6px] grid place-items-center text-[9.5px] border ${
                isPresent
                  ? "bg-ar-gold2 border-ar-gold2 text-ar-ongold font-bold"
                  : isToday
                    ? "border-ar-gold text-ar-gold"
                    : isFuture
                      ? "border-ar-line/50 text-ar-faint"
                      : "border-ar-line text-ar-dim"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>

      {data.todayDay !== null && (
        <button
          disabled={busy || data.checkedInToday}
          onClick={checkIn}
          className="w-full py-3 ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60"
        >
          {data.checkedInToday ? "✓ Sudah Absen Hari Ini" : "Absen Hari Ini"}
        </button>
      )}
    </div>
  );
}
