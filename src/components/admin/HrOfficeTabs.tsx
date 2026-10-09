"use client";

import { useState } from "react";
import JabatanPanel from "@/components/admin/JabatanPanel";
import ResignPayslipArchive from "@/components/admin/ResignPayslipArchive";

/** HR & Office: Jabatan (who holds Admin/Kepala Mess/Manager) and the locked archive of resigned staff/Tera payslips. */
export default function HrOfficeTabs({ initialTab }: { initialTab: "jabatan" | "arsip" }) {
  const [tab, setTab] = useState<"jabatan" | "arsip">(initialTab);
  return (
    <div className="pt-5.5">
      <div className="flex gap-2 mb-4" role="tablist">
        {([["jabatan", "Jabatan"], ["arsip", "Arsip Slip Resign (Staff & Tera)"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-2 px-4 rounded-[10px] border text-[12px] cursor-pointer ${
              tab === id ? "bg-ar-goldfill border-ar-goldline text-ar-text" : "border-ar-line text-ar-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "jabatan" ? <JabatanPanel /> : <ResignPayslipArchive />}
    </div>
  );
}
