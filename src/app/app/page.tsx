import { getSession } from "@/lib/auth";
import { getBerandaData } from "@/lib/data/beranda";
import Badge from "@/components/Badge";
import { ATTENDANCE_RADIUS_KM } from "@/lib/constants";

export default async function BerandaPage() {
  const session = await getSession();
  const data = await getBerandaData(session!.employeeId);

  return (
    <div>
      <div className="pt-3 pb-3.5">
        <div className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim">{data.greeting}</div>
        <div className="font-display text-[29px] leading-[1.15] mt-1">{data.meName}</div>
        <div className="inline-block mt-2 py-1 px-2.5 border border-ar-goldline rounded-full text-[10px] tracking-[0.14em] uppercase text-ar-gold">
          {data.meLevel} · {data.meCode}
        </div>
      </div>

      <div className="bg-ar-goldfill border border-ar-goldline rounded-2xl p-[17px] mb-3.5">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim">Absensi hari ini</div>
            <div className="font-display text-[26px] mt-1 text-ar-gold2">Masuk {data.checkInTime}</div>
          </div>
          <Badge status={data.inRadius ? "Dalam radius" : "Luar radius"} />
        </div>
        <div className="mt-[13px] pt-[13px] border-t border-ar-goldline grid gap-1.5 text-[11.5px] text-ar-dim">
          <div className="flex justify-between gap-2.5">
            <span>Lokasi</span>
            <span className="text-ar-text text-right">{data.myPlace}</span>
          </div>
          <div className="flex justify-between gap-2.5">
            <span>Jarak dari pusat</span>
            <span className="text-ar-text">
              {data.myDistanceKm ?? "—"} / {ATTENDANCE_RADIUS_KM} km
            </span>
          </div>
          <div className="flex justify-between gap-2.5">
            <span>Koordinat</span>
            <span className="text-ar-text">{data.myCoord}</span>
          </div>
        </div>
      </div>

      <div className="bg-ar-surface border border-ar-line rounded-2xl p-[18px] mb-3.5">
        <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim">Saldo voucher belum dicairkan</div>
        <div className="font-display text-[38px] leading-[1.12] text-ar-gold2 mt-1">{data.saldoTotal}</div>
        <div className="text-[11.5px] text-ar-dim mt-1">
          {data.saldoCount} voucher · pencairan {data.nextPayout}
        </div>
        <div className="flex gap-2 mt-[14px]">
          <div className="flex-1 py-[11px] px-3 bg-ar-surface2 border border-ar-line rounded-xl">
            <div className="text-[9.5px] tracking-[0.14em] uppercase text-ar-dim/80">Silver</div>
            <div className="text-sm mt-1">{data.silverCount} × 150K</div>
          </div>
          <div className="flex-1 py-[11px] px-3 bg-ar-goldfill border border-ar-goldline rounded-xl">
            <div className="text-[9.5px] tracking-[0.14em] uppercase text-ar-gold">Platinum / Jasmine</div>
            <div className="text-sm mt-1">{data.platinumCount} × 400K</div>
          </div>
        </div>
      </div>

      <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim mt-4 mb-2.5">Aktivitas terakhir</div>
      <div className="flex flex-col gap-2">
        {data.feed.length === 0 && (
          <div className="text-[12px] text-ar-faint py-3">Belum ada voucher tercatat.</div>
        )}
        {data.feed.map((f, i) => (
          <div
            key={i}
            className="flex gap-3 items-start py-3 px-3.5 bg-ar-surface2 border border-ar-line rounded-xl"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ar-gold mt-1.5 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px]">{f.title}</span>
              <span className="block text-[10.5px] text-ar-dim mt-1">{f.meta}</span>
            </span>
            <span className="text-[11px] text-ar-gold whitespace-nowrap">{f.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
