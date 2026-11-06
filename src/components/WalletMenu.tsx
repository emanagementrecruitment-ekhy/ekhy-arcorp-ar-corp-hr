import Icon, { type IconName } from "@/components/ui/Icon";

// Preview of the upcoming e-wallet (Panduan page): a service-menu grid like a typical wallet app,
// branded with the client's own name (BRAND.short comes from the client's env), not a fixed logo.
const GROUPS: { title: string; items: { icon: IconName; label: string }[] }[] = [
  {
    title: "Transaksi",
    items: [
      { icon: "banknote", label: "Terima Gaji" },
      { icon: "wallet", label: "Tarik Tunai" },
      { icon: "briefcase", label: "Kirim ke Bank" },
      { icon: "users", label: "Kirim ke Grup" },
      { icon: "link", label: "Kirim ke Chat" },
      { icon: "scan", label: "Kode Tunai" },
      { icon: "receipt", label: "Bayar Kasbon" },
      { icon: "chart", label: "Riwayat Saldo" },
    ],
  },
  {
    title: "Top Up & Layanan Digital",
    items: [
      { icon: "ticket", label: "Pulsa & Data" },
      { icon: "wallet", label: "Kirim ke e-Wallet" },
      { icon: "refresh", label: "Uang Elektronik" },
      { icon: "bell", label: "Pengingat Tagihan" },
    ],
  },
];

export default function WalletMenu({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-label={`Rancangan menu dompet digital ${label}`}>
      <div
        className="rounded-2xl border border-ar-goldline px-4 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg,#1b1608 0%,#3a2d0c 55%,#b98a2a 100%)", color: "#f4e6b8" }}
      >
        <div>
          <div className="font-iso text-[17px]">{label} Wallet</div>
          <div className="text-[10px] tracking-[0.28em] uppercase opacity-70 mt-1">Saldo</div>
          <div className="font-unique text-[20px] tracking-[0.12em]">Rp •••••••</div>
        </div>
        <span className="text-[9.5px] tracking-[0.25em] uppercase opacity-80">Segera hadir</span>
      </div>

      {GROUPS.map((g) => (
        <div key={g.title} className="rounded-2xl border border-ar-line bg-ar-surface px-3 py-3">
          <div className="text-[12px] font-semibold text-ar-gold2 mb-2 px-1">{g.title}</div>
          <div className="grid grid-cols-4 gap-y-3 gap-x-1">
            {g.items.map((it) => (
              <div key={it.label} className="flex flex-col items-center text-center gap-1 opacity-90">
                <span className="w-11 h-11 rounded-xl grid place-items-center border border-ar-goldline text-ar-gold2 bg-ar-bg">
                  <Icon name={it.icon} className="w-[22px] h-[22px]" />
                </span>
                <span className="text-[10.5px] leading-[1.25] text-ar-dim">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
