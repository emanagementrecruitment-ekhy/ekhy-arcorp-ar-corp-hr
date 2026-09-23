"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { EmployeeLevel } from "@/lib/constants";
import EmployeeFields, { type EmployeeFieldsValue, type SupervisorOption } from "./EmployeeFields";

export interface EditableEmployee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  level: EmployeeLevel | null;
  role: string;
  place: string;
  supervisorId: string;
  channelLink: string;
  birthPlace: string | null;
  birthDate: string | null; // ISO datetime string, or null
  customRate: number | null;
  salary: number | null;
  // Optional: pages that don't otherwise load an employee's physical stats
  // (e.g. Lokasi & Absensi) can omit these rather than plumb them through
  // just to satisfy this type — the form simply starts them blank.
  ageYears?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  // Optional for the same reason — only the Data Tera/Karyawan edit form
  // needs to manage the employee's self-service profile photo.
  photoDataUrl?: string | null;
}

export default function EditEmployeeForm({
  employee,
  supervisors,
  onSaved,
  onCancel,
}: {
  employee: EditableEmployee;
  supervisors: SupervisorOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<EmployeeFieldsValue>({
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    level: employee.level ?? "SILVER",
    role: employee.role,
    place: employee.place,
    supervisorId: employee.supervisorId,
    channelLink: employee.channelLink,
    birthPlace: employee.birthPlace ?? "",
    birthDate: employee.birthDate ? employee.birthDate.slice(0, 10) : "",
    customRate: employee.customRate != null ? String(employee.customRate) : "",
    salary: employee.salary != null ? String(employee.salary) : "",
    ageYears: employee.ageYears != null ? String(employee.ageYears) : "",
    weightKg: employee.weightKg != null ? String(employee.weightKg) : "",
    heightCm: employee.heightCm != null ? String(employee.heightCm) : "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState(employee.photoDataUrl ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);

  function pickPhotoFile() {
    setPhotoMsg("");
    photoFileRef.current?.click();
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoMsg("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/admin/employees/${employee.id}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhotoMsg(data.error ?? "Gagal mengganti foto.");
        return;
      }
      setPhotoDataUrl(dataUrl);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoMsg("");
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}/photo`, { method: "DELETE" });
      const data = await res.json();
      setConfirmRemovePhoto(false);
      if (!res.ok) {
        setPhotoMsg(data.error ?? "Gagal menghapus foto.");
        return;
      }
      setPhotoDataUrl(null);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, supervisorId: value.supervisorId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4.5 bg-ar-surface2 border border-ar-goldline rounded-2xl my-1" style={{ gridColumn: "1 / -1" }}>
      <div className="flex justify-between items-center mb-3.5">
        <span className="font-display text-[17px] text-ar-gold2">
          Edit {employee.name} ({employee.code})
        </span>
        <button onClick={onCancel} className="text-ar-dim text-[11px] cursor-pointer">
          Batal
        </button>
      </div>

      <div className="flex items-center gap-3.5 mb-3.5 p-3.5 bg-ar-surface border border-ar-line rounded-2xl">
        {photoDataUrl ? (
          <Image
            src={photoDataUrl}
            alt="Foto profil"
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full object-cover border border-ar-goldline shrink-0"
          />
        ) : (
          <span className="w-12 h-12 shrink-0 rounded-full border border-ar-goldline grid place-items-center text-[10px] text-ar-faint text-center leading-[1.3]">
            Belum ada foto
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[9.5px] tracking-[0.16em] uppercase text-ar-dim">Foto Profil</div>
          <div className="text-[10.5px] text-ar-faint mt-0.5 leading-[1.5]">
            Diganti sendiri oleh karyawan (terkunci 30 hari). Owner bisa mengganti atau menghapusnya kapan saja.
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          <div className="flex gap-2">
            <button
              onClick={pickPhotoFile}
              disabled={photoBusy}
              className="py-1.5 px-3 bg-ar-surface2 border border-ar-line rounded-lg text-ar-gold text-[10.5px] cursor-pointer disabled:opacity-60"
            >
              Ganti Foto
            </button>
            {photoDataUrl &&
              (confirmRemovePhoto ? (
                <span className="flex gap-1.5 items-center">
                  <button onClick={removePhoto} disabled={photoBusy} className="text-[10.5px] text-ar-red font-semibold cursor-pointer">
                    Ya, Hapus
                  </button>
                  <button onClick={() => setConfirmRemovePhoto(false)} className="text-[10.5px] text-ar-dim cursor-pointer">
                    Batal
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmRemovePhoto(true)}
                  disabled={photoBusy}
                  className="py-1.5 px-3 bg-ar-surface2 border border-ar-line rounded-lg text-ar-red text-[10.5px] cursor-pointer disabled:opacity-60"
                >
                  Hapus
                </button>
              ))}
          </div>
          {photoMsg && <div className="text-[10.5px] text-ar-red text-right max-w-[180px]">{photoMsg}</div>}
        </div>
        <input ref={photoFileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={onPhotoSelected} />
      </div>

      <EmployeeFields
        value={value}
        onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
        supervisors={supervisors}
        excludeSupervisorId={employee.id}
      />

      <div className="min-h-[18px] text-[11px] mt-3 text-ar-red">{msg}</div>
      <button
        disabled={busy}
        onClick={submit}
        className="mt-1 py-2.5 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
      >
        Simpan Perubahan
      </button>
    </div>
  );
}
