"use client";

import { useEffect, useMemo, useState } from "react";
import { cachedJson } from "@/lib/client-cache";
import { isLink } from "@/lib/format";

interface Row {
  id: string;
  name: string;
  code: string;
  role: string;
  channelLink: string;
}

const inputClass = "w-full py-2.5 px-3 bg-ar-surface2 border border-ar-line rounded-xl text-[13px] text-ar-text outline-none";

export default function ChannelLinkList() {
  const [tera, setTera] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cachedJson<{ employees: Row[] }>("/api/admin/employees?type=tera&pageSize=500&lite=1"),
      cachedJson<{ employees: Row[] }>("/api/admin/employees?type=staff&pageSize=500&lite=1"),
    ])
      .then(([t, s]) => {
        setTera(t.employees ?? []);
        setStaff(s.employees ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const needle = q.trim().toLowerCase();
  const match = (r: Row) => !needle || `${r.name} ${r.code} ${r.role} ${r.channelLink}`.toLowerCase().includes(needle);
  const groups = useMemo(
    () => [
      { title: "Tera", rows: tera.filter(match) },
      { title: "Karyawan", rows: staff.filter(match) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tera, staff, needle],
  );

  return (
    <div className="mt-5.5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode, atau channel…" className={`${inputClass} max-w-[360px] mb-4`} />
      {loading && <div className="text-[12px] text-ar-dim">Memuat…</div>}
      {groups.map((g) => (
        <div key={g.title} className="mb-6">
          <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-2">
            {g.title} · {g.rows.length}
          </div>
          <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-hidden">
            {g.rows.length === 0 && !loading && <div className="py-5 px-4 text-[12px] text-ar-faint">Belum ada data.</div>}
            {g.rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.6fr)] gap-3 py-2.5 px-4 border-b border-ar-line last:border-0 text-[12px]">
                <span className="text-ar-text">
                  {r.name} <span className="text-ar-faint text-[10.5px]">{r.code}</span>
                </span>
                <span className="text-ar-dim">{r.role}</span>
                <span className="break-all">
                  {r.channelLink ? (
                    isLink(r.channelLink) ? (
                      <a href={r.channelLink.startsWith("http") ? r.channelLink : `https://${r.channelLink}`} target="_blank" rel="noopener noreferrer" className="text-ar-gold underline">
                        {r.channelLink}
                      </a>
                    ) : (
                      r.channelLink
                    )
                  ) : (
                    <span className="text-ar-faint">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
