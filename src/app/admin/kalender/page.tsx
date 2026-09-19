"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface Reminder {
  id: string;
  title: string;
  message: string;
  scheduledAt: string;
  sentAt: string | null;
  createdByName: string;
  recipients: { id: string; name: string; code: string }[];
}

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
  role: string;
}

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminKalenderPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [time, setTime] = useState("09:00");
  const [targetAll, setTargetAll] = useState(true);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  function load() {
    // Pull a little padding either side so days from the previous/next month
    // shown to fill the grid still display their reminders correctly.
    const from = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - 7);
    const to = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 7);
    fetch(`/api/admin/reminders?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []));
  }

  useEffect(load, [monthStart, monthEnd]);
  useEffect(() => {
    fetch("/api/admin/employees?pageSize=500")
      .then((r) => r.json())
      .then((d) => setEmployees((d.employees ?? []).map((e: EmployeeOption) => ({ id: e.id, name: e.name, code: e.code, role: e.role }))));
  }, []);

  const remindersByDay = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const r of reminders) {
      const key = ymd(new Date(r.scheduledAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [reminders]);

  const gridDays = useMemo(() => {
    const firstWeekday = monthStart.getDay();
    const days: Date[] = [];
    for (let i = 0; i < firstWeekday; i++) days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() - firstWeekday + i));
    for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    while (days.length % 7 !== 0) days.push(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + (days.length - (firstWeekday + monthEnd.getDate()) + 1)));
    return days;
  }, [monthStart, monthEnd]);

  function openFormFor(dateKey: string) {
    setSelectedDate(dateKey);
    setTitle("");
    setMessage("");
    setTime("09:00");
    setTargetAll(true);
    setPickedIds([]);
    setSearch("");
    setError("");
    setFormOpen(true);
  }

  async function submit() {
    if (!selectedDate) return;
    setBusy(true);
    setError("");
    try {
      const scheduledAt = new Date(`${selectedDate}T${time}:00`).toISOString();
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, scheduledAt, targetAll, employeeIds: pickedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan pengingat.");
        return;
      }
      setFormOpen(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelReminder(id: string) {
    if (!confirm("Batalkan pengingat ini?")) return;
    const res = await fetch(`/api/admin/reminders/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Gagal membatalkan.");
    }
  }

  const filteredEmployees = employees.filter(
    (e) => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase())
  );

  const selectedDayReminders = selectedDate ? remindersByDay.get(selectedDate) ?? [] : [];
  const todayKey = ymd(new Date());

  return (
    <div>
      <AdminPageHeader title="Kalender Pengingat" subtitle="Kirim pengingat ke HP karyawan/Tera lewat notifikasi aplikasi" />

      <div className="pt-5.5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="py-1.5 px-3 bg-ar-surface2 border border-ar-line rounded-lg text-ar-dim cursor-pointer text-[12px]"
            >
              ←
            </button>
            <div className="font-display text-[17px] min-w-[170px] text-center">
              {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
            </div>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="py-1.5 px-3 bg-ar-surface2 border border-ar-line rounded-lg text-ar-dim cursor-pointer text-[12px]"
            >
              →
            </button>
          </div>
          <button
            onClick={() => openFormFor(todayKey)}
            className="py-2.5 px-4 ar-grad rounded-[9px] text-ar-ongold text-[10.5px] font-bold tracking-[0.12em] uppercase cursor-pointer"
          >
            + Tambah Pengingat
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[9.5px] tracking-[0.1em] uppercase text-ar-faint">
          {DAY_LABELS.map((l) => (
            <div key={l} className="py-1">
              {l}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {gridDays.map((d) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayReminders = remindersByDay.get(key) ?? [];
            return (
              <button
                key={key}
                onClick={() => openFormFor(key)}
                className={`text-left min-h-[78px] p-1.5 rounded-lg border cursor-pointer transition ${
                  key === todayKey ? "border-ar-goldline bg-ar-goldfill/40" : "border-ar-line bg-ar-surface"
                } ${!inMonth ? "opacity-35" : ""}`}
              >
                <div className="text-[11px] text-ar-dim">{d.getDate()}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {dayReminders.slice(0, 2).map((r) => (
                    <div
                      key={r.id}
                      className={`truncate text-[9.5px] px-1.5 py-0.5 rounded ${
                        r.sentAt ? "bg-ar-green/15 text-ar-green" : "bg-ar-goldfill text-ar-gold2"
                      }`}
                    >
                      {r.title}
                    </div>
                  ))}
                  {dayReminders.length > 2 && <div className="text-[9px] text-ar-faint">+{dayReminders.length - 2} lagi</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          Klik tanggal untuk menambah pengingat baru. Pengingat terkirim otomatis pada jam yang dipilih lewat notifikasi
          aplikasi — karyawan/Tera harus mengaktifkan notifikasi di aplikasi mereka (banner &quot;Aktifkan Notifikasi&quot;
          muncul otomatis saat mereka login).
        </div>
      </div>

      {formOpen && selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setFormOpen(false)}
        >
          <div className="w-full max-w-[480px] max-h-[85vh] overflow-y-auto bg-ar-surface border border-ar-line rounded-2xl p-5 flex flex-col gap-3.5">
            <div className="font-display text-[17px]">Pengingat — {selectedDate}</div>

            {selectedDayReminders.length > 0 && (
              <div className="flex flex-col gap-1.5 pb-2 border-b border-ar-line">
                {selectedDayReminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px] py-1.5 px-2 bg-ar-surface2 rounded-lg">
                    <div>
                      <span className={r.sentAt ? "text-ar-green" : "text-ar-gold2"}>{r.sentAt ? "Terkirim" : "Terjadwal"}</span>
                      {" · "}
                      {r.title} ({r.recipients.length} penerima)
                    </div>
                    {!r.sentAt && (
                      <button onClick={() => cancelReminder(r.id)} className="text-ar-red text-[10.5px] cursor-pointer">
                        Batalkan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <label className="text-[9.5px] tracking-[0.12em] uppercase text-ar-dim">Judul</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Briefing Bulanan"
              className="py-2.5 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-[13px]"
            />

            <label className="text-[9.5px] tracking-[0.12em] uppercase text-ar-dim">Pesan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Isi pengingat yang akan muncul di notifikasi HP"
              className="py-2.5 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-[13px] resize-none"
            />

            <label className="text-[9.5px] tracking-[0.12em] uppercase text-ar-dim">Jam</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="py-2.5 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-[13px]"
            />

            <label className="flex items-center gap-2 text-[12px] mt-1">
              <input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} />
              Kirim ke Semua Karyawan/Tera
            </label>

            {!targetAll && (
              <div className="flex flex-col gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama/kode..."
                  className="py-2 px-3 bg-ar-input border border-ar-line rounded-[9px] text-[12px]"
                />
                <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1 border border-ar-line rounded-lg p-2">
                  {filteredEmployees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-[11.5px] py-0.5">
                      <input
                        type="checkbox"
                        checked={pickedIds.includes(e.id)}
                        onChange={(ev) =>
                          setPickedIds((ids) => (ev.target.checked ? [...ids, e.id] : ids.filter((x) => x !== e.id)))
                        }
                      />
                      {e.name} <span className="text-ar-faint">({e.code} · {e.role})</span>
                    </label>
                  ))}
                  {filteredEmployees.length === 0 && <div className="text-[11px] text-ar-faint py-1">Tidak ditemukan.</div>}
                </div>
                <div className="text-[10.5px] text-ar-dim">{pickedIds.length} dipilih</div>
              </div>
            )}

            {error && <div className="text-[11.5px] text-ar-red">{error}</div>}

            <div className="flex gap-2 mt-1">
              <button
                onClick={submit}
                disabled={busy || !title || !message}
                className="flex-1 py-2.5 ar-grad rounded-[9px] text-ar-ongold text-[10.5px] font-bold tracking-[0.12em] uppercase cursor-pointer disabled:opacity-50"
              >
                {busy ? "Menyimpan..." : "Simpan Pengingat"}
              </button>
              <button
                onClick={() => setFormOpen(false)}
                className="py-2.5 px-4 bg-transparent border border-ar-line rounded-[9px] text-ar-dim text-[10.5px] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
