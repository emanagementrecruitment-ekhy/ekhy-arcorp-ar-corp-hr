"use client";

import { useEffect, useRef, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AddEmployeeForm from "@/components/admin/AddEmployeeForm";
import EditEmployeeForm from "@/components/admin/EditEmployeeForm";

interface EmpRow {
  id: string;
  name: string;
  code: string;
  role: string;
  level: "SILVER" | "PLATINUM";
  email: string;
  phone: string;
  place: string;
  supervisorId: string;
  count: string;
  kasbon: string;
  total: string;
}

interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export default function KaryawanPage() {
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A newer notice must win even if an older one's auto-clear timer hasn't
  // fired yet — two mutations in quick succession (e.g. delete, then delete
  // again) would otherwise have the first notice's timeout blank out the
  // second, freshly-set one.
  function showNotice(text: string, ms: number) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => {
      setNotice("");
      noticeTimer.current = null;
    }, ms);
  }

  function loadSupervisors() {
    fetch("/api/admin/employees?pageSize=500")
      .then((r) => r.json())
      .then((d) => setSupervisors((d.employees ?? []).map((e: EmpRow) => ({ id: e.id, name: e.name, code: e.code }))));
  }

  function loadPage(p: number, q: string) {
    const params = new URLSearchParams({ page: String(p) });
    if (q) params.set("q", q);
    fetch(`/api/admin/employees?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.employees ?? []);
        setTotal(d.total ?? 0);
        setPage(d.page ?? 1);
        setTotalPages(d.totalPages ?? 1);
      });
  }

  useEffect(() => {
    loadPage(1, "");
    loadSupervisors();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCanEdit(["OWNER", "CONSULTANT"].includes(d.session?.accessRole)));
  }, []);

  // Debounce search: reset to page 1 whenever the query settles.
  useEffect(() => {
    const t = setTimeout(() => loadPage(1, query), 300);
    return () => clearTimeout(t);
  }, [query]);

  function onCreated() {
    // Clear any active filter/page so the new employee isn't hidden behind a
    // search that no longer matches, or a page it doesn't happen to fall on.
    setQuery("");
    loadPage(1, "");
    loadSupervisors();
  }

  function onSaved() {
    setEditingId(null);
    showNotice("✓ Perubahan disimpan.", 2500);
    loadPage(page, query);
    loadSupervisors();
  }

  async function confirmDelete(row: EmpRow) {
    setDeleteMsg("");
    const res = await fetch(`/api/admin/employees/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    setConfirmDeleteId(null);
    if (!res.ok) {
      setDeleteMsg(data.error ?? "Gagal menghapus karyawan.");
      return;
    }
    const reassigned = data.reassignedReports ? ` ${data.reassignedReports} anak buahnya dipindahkan ke "Tidak ada supervisor".` : "";
    showNotice(`✓ ${row.name} (${row.code}) dihapus.${reassigned}`, 4000);
    loadPage(page, query);
    loadSupervisors();
  }

  const cols = canEdit ? "1.4fr .9fr 1.4fr .8fr .8fr 1fr auto" : "1.6fr 1fr 1.5fr .9fr .9fr 1.1fr";

  return (
    <div>
      <AdminPageHeader title="Data Karyawan" subtitle={`${total} karyawan terdaftar · login dengan email atau nomor HP`} />

      <div className="pt-5.5">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-3.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, kode, email, atau nomor HP…"
            className="flex-1 min-w-[220px] py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
          />
          {canEdit && <AddEmployeeForm supervisors={supervisors} onCreated={onCreated} />}
        </div>

        {notice && (
          <div className="mb-3.5 py-3 px-4 bg-[rgba(127,209,168,.1)] border border-[rgba(127,209,168,.3)] rounded-xl text-ar-green text-[12px]">
            {notice}
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
            {canEdit && <span>Aksi</span>}
          </div>
          {rows.length === 0 && (
            <div className="py-8 px-4.5 text-center text-[12.5px] text-ar-faint">
              {query ? `Tidak ada karyawan yang cocok dengan "${query}".` : "Belum ada karyawan."}
            </div>
          )}
          {rows.map((e) =>
            editingId === e.id ? (
              <div key={e.code} className="px-4.5 border-t border-ar-line">
                <EditEmployeeForm
                  employee={{
                    id: e.id,
                    code: e.code,
                    name: e.name,
                    email: e.email,
                    phone: e.phone,
                    level: e.level,
                    role: e.role,
                    place: e.place,
                    supervisorId: e.supervisorId,
                  }}
                  supervisors={supervisors}
                  onSaved={onSaved}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
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
                {canEdit &&
                  (confirmDeleteId === e.id ? (
                    <span className="flex flex-col gap-1 items-start">
                      <span className="text-[10.5px] text-ar-red">Yakin?</span>
                      <span className="flex gap-2">
                        <button onClick={() => confirmDelete(e)} className="text-[10.5px] text-ar-red font-semibold cursor-pointer">
                          Ya, Hapus
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-[10.5px] text-ar-dim cursor-pointer">
                          Batal
                        </button>
                      </span>
                    </span>
                  ) : (
                    <span className="flex gap-2.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingId(e.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-[11px] text-ar-gold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(e.id)}
                        className="text-[11px] text-ar-red cursor-pointer"
                      >
                        Hapus
                      </button>
                    </span>
                  ))}
              </div>
            )
          )}
        </div>

        {deleteMsg && <div className="mt-2.5 text-[11.5px] text-ar-red">{deleteMsg}</div>}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3.5 text-[11.5px] text-ar-dim">
            <button
              disabled={page <= 1}
              onClick={() => loadPage(page - 1, query)}
              className="py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              ← Sebelumnya
            </button>
            <span>
              Halaman {page} dari {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => loadPage(page + 1, query)}
              className="py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              Berikutnya →
            </button>
          </div>
        )}

        <div className="mt-3.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          Hak akses: hanya <span className="text-ar-gold">Owner</span> dan <span className="text-ar-gold">Consultant</span> yang
          dapat mengubah data karyawan, nilai voucher, dan menyetujui kasbon. Admin pusat hanya melihat dan mengunduh laporan.
        </div>
      </div>
    </div>
  );
}
