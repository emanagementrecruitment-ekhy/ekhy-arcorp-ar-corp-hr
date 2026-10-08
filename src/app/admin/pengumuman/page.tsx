"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { btnPrimaryClass, inputClass } from "@/components/ui/styles";

/** ISO string -> value a <input type="datetime-local"> accepts, in the browser's own local time. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PengumumanPage() {
  const [canManageAnnouncement, setCanManageAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementStart, setAnnouncementStart] = useState("");
  const [announcementEnd, setAnnouncementEnd] = useState("");
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState("");

  function loadAnnouncement() {
    fetch("/api/admin/announcement")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setCanManageAnnouncement(true);
        setAnnouncementText(d.text ?? "");
        setAnnouncementStart(toLocalInputValue(d.startAt));
        setAnnouncementEnd(toLocalInputValue(d.endAt));
      })
      .catch(() => setCanManageAnnouncement(false));
  }

  useEffect(loadAnnouncement, []);

  async function saveAnnouncement() {
    setAnnouncementBusy(true);
    setAnnouncementMsg("");
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: announcementText,
          startAt: announcementStart ? new Date(announcementStart).toISOString() : null,
          endAt: announcementEnd ? new Date(announcementEnd).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnnouncementMsg(data.error ?? "Gagal menyimpan pengumuman.");
        return;
      }
      setAnnouncementMsg("✓ Tersimpan.");
    } finally {
      setAnnouncementBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Pengumuman" subtitle="Teks berjalan di aplikasi karyawan/Tera" />
      <div className="pt-5.5 flex flex-col gap-4">
        {!canManageAnnouncement && (
          <div className="p-4 bg-ar-surface border border-ar-line rounded-2xl text-[12px] text-ar-dim">
            Peran Anda tidak dapat mengatur pengumuman.
          </div>
        )}
        {canManageAnnouncement && (
          <div className="p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl">
            <div className="font-display text-[17px] text-ar-gold2 mb-1">📢 Pengumuman Berjalan</div>
            <div className="text-[11.5px] text-ar-dim mb-3 leading-[1.6]">
              Teks berjalan yang tampil di bawah logo pada aplikasi karyawan/Tera. Atur jadwalnya di sini —
              kosongkan &quot;Berhenti tampil&quot; supaya berjalan terus selamanya.
            </div>
            <textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Contoh: Libur bersama tanggal 25 Desember, kantor pusat tutup."
              rows={3}
              className={`${inputClass} mb-2.5`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase text-ar-dim mb-1">
                  Mulai tampil (kosong = langsung)
                </label>
                <input
                  type="datetime-local"
                  value={announcementStart}
                  onChange={(e) => setAnnouncementStart(e.target.value)}
                  className="w-full py-2 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-ar-text text-[12px]"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.12em] uppercase text-ar-dim mb-1">
                  Berhenti tampil (kosong = selamanya)
                </label>
                <input
                  type="datetime-local"
                  value={announcementEnd}
                  onChange={(e) => setAnnouncementEnd(e.target.value)}
                  className="w-full py-2 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-ar-text text-[12px]"
                />
              </div>
            </div>
            {announcementMsg && <div className="text-[11.5px] text-ar-green mb-2">{announcementMsg}</div>}
            <button
              disabled={announcementBusy}
              onClick={saveAnnouncement}
              className={`${btnPrimaryClass} py-2.5 px-5`}
            >
              {announcementBusy ? "Menyimpan…" : "Simpan Pengumuman"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
