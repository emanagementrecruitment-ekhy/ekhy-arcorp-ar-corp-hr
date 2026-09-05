import Image from "next/image";
import LogoutButton from "@/components/LogoutButton";

export default function AppHeader({ name, code }: { name: string; code: string }) {
  return (
    <div className="max-w-[720px] w-full mx-auto flex flex-wrap items-center justify-between gap-4 px-4 sm:px-5 pt-6 pb-5 border-b border-ar-line">
      <div className="flex items-center gap-3">
        <Image
          src="/ar-corp-logo.png"
          alt="AR Corp"
          width={42}
          height={42}
          className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
        />
        <div>
          <div className="font-display text-[13px] tracking-[0.34em] text-ar-gold uppercase">AR Corp</div>
          <div className="text-[10px] tracking-[0.16em] text-ar-dim mt-1 uppercase">
            Aplikasi Karyawan · {name} ({code})
          </div>
        </div>
      </div>
      <LogoutButton className="py-[9px] px-[15px] bg-transparent border border-ar-line rounded-[9px] text-ar-dim text-[11px] cursor-pointer" />
    </div>
  );
}
