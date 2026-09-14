"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Portal = "karyawan" | "pusat";
type Step = "id" | "otp" | "gps";

interface GpsStep {
  label: string;
  value: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [portal, setPortal] = useState<Portal>("karyawan");
  const [step, setStep] = useState<Step>("id");
  const [loginId, setLoginId] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsSteps, setGpsSteps] = useState<GpsStep[]>([]);
  const [gpsReady, setGpsReady] = useState(false);

  function pickPortal(p: Portal) {
    setPortal(p);
    setLoginId("");
    setStep("id");
    setError("");
    setDevCode(null);
    setIsDemo(false);
    setDelivered(false);
  }

  async function sendOtp() {
    if (!loginId.trim()) {
      setError("Masukkan email terdaftar atau nomor HP.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId, portal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim kode.");
        return;
      }
      setDevCode(data.devCode ?? null);
      setIsDemo(Boolean(data.isDemo));
      setDelivered(Boolean(data.delivered));
      setOtp("");
      setStep("otp");
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (otp.length < 6) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId, code: otp, portal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kode salah.");
        return;
      }
      if (data.requiresAttendance) {
        beginAttendance();
      } else if (data.accessRole === "SUPERVISOR") {
        router.push("/admin/lapor-lapangan");
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  function beginAttendance() {
    setStep("gps");
    setGpsSteps([
      { label: "Perangkat", value: navigator.userAgent.includes("Mobile") ? "Mobile · AR Corp App 1.0" : "Desktop · AR Corp Web 1.0" },
      { label: "Koordinat", value: "Mencari lokasi…" },
      { label: "Jarak dari kantor pusat", value: "Menghitung…" },
      { label: "Status absensi", value: "Menunggu koordinat…" },
      { label: "Notifikasi ke pusat", value: "Menunggu…" },
    ]);

    const finish = (lat?: number, lng?: number) =>
      fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      })
        .then((r) => r.json())
        .then((data) => {
          setGpsSteps([
            { label: "Perangkat", value: navigator.userAgent.includes("Mobile") ? "Mobile · AR Corp App 1.0" : "Desktop · AR Corp Web 1.0" },
            { label: "Koordinat", value: Number.isFinite(data.lat) ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` : "—" },
            { label: "Jarak dari kantor pusat", value: `${data.distanceKm} km · batas ${data.radiusKm} km` },
            { label: "Status absensi", value: data.inRadius ? "Diterima — dalam radius" : "Ditandai — di luar radius" },
            { label: "Notifikasi ke pusat", value: `Terkirim ${new Date(data.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` },
          ]);
          setGpsReady(true);
        });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => finish(p.coords.latitude, p.coords.longitude),
        () => finish(undefined, undefined),
        { timeout: 6000 }
      );
    } else {
      finish(undefined, undefined);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-5 sm:p-10 ar-glow-corners ar-stars">
      <div className="w-full max-w-[430px] ar-in">
        <div className="flex flex-col items-center gap-3.5 mb-6">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full opacity-70 blur-md" style={{ background: "radial-gradient(circle, rgba(201,162,74,0.35), transparent 70%)" }} />
            <Image
              src="/api/brand-logo"
              alt="AR Corp"
              width={104}
              height={104}
              unoptimized
              className="relative rounded-full object-contain bg-ar-bg border border-ar-goldline"
            />
          </div>
          <div className="text-center">
            <div className="font-display text-[17px] tracking-[0.42em] uppercase font-bold">
              <span className="ar-shimmer-gold">E-MANAGEMENT</span>
            </div>
            <div className="text-[10.5px] tracking-[0.24em] text-ar-dim mt-1.5 uppercase">
              Operations Portal Check Your Slip Pay
            </div>
          </div>
        </div>

        <div className="ar-divider-ornate mb-5">
          <span className="ar-divider-ornate-mark" />
        </div>

        <div className="ar-ring-gold">
        <div className="ar-frame-luxury bg-ar-surface rounded-[18px] px-[26px] pt-7 pb-6">
          <div className="grid grid-cols-2 gap-2 p-[5px] bg-ar-surface2 rounded-xl mb-[22px]">
            <button
              onClick={() => pickPortal("karyawan")}
              className={`py-[11px] rounded-[9px] text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer transition ${
                portal === "karyawan" ? "ar-tab-active-gold shadow-[inset_0_0_0_1px_var(--ar-truegold-line)]" : "text-ar-dim"
              }`}
            >
              STAFF &amp; PR
            </button>
            <button
              onClick={() => pickPortal("pusat")}
              className={`py-[11px] rounded-[9px] text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer transition ${
                portal === "pusat" ? "ar-tab-active-gold shadow-[inset_0_0_0_1px_var(--ar-truegold-line)]" : "text-ar-dim"
              }`}
            >
              OFFICE
            </button>
          </div>

          {step === "id" && (
            <div>
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 text-ar-truegold opacity-75 pointer-events-none"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <input
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  placeholder="YOUR EMAIL"
                  className="w-full py-[14px] pl-11 pr-4 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[10.5px] text-left"
                />
              </div>
              <div className="min-h-[19px] text-[11.5px] text-ar-red mt-2">{error}</div>
              <button
                disabled={busy}
                onClick={sendOtp}
                className="w-full py-[15px] ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span>Kirim Kode Verifikasi</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 shrink-0"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </button>
              <div className="mt-[18px] pt-4 border-t border-ar-line flex items-center justify-center gap-1.5 text-[11.5px] leading-[1.75] text-ar-dim text-center font-semibold">
                <svg viewBox="0 0 24 24" fill="#25D366" className="w-3.5 h-3.5 shrink-0">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.9.525 3.68 1.438 5.2L2 22l4.938-1.395A9.94 9.94 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm4.472 12.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                <span>Kode verifikasi dikirim ke email/WhatsApp terdaftar.</span>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div>
              <div className="text-[12.5px] leading-[1.6] text-ar-dim mb-4">
                Kode 6 angka dikirim ke <span className="text-ar-gold">{loginId}</span>
              </div>
              {devCode && (
                <div className="mb-3 py-2 px-3 rounded-lg border border-ar-goldline bg-ar-goldfill text-ar-gold2 text-[12px] text-center tracking-[0.1em]">
                  {isDemo ? "Akun demo — kode Anda: " : "Mode pengembangan — kode Anda: "}
                  <strong>{devCode}</strong>
                </div>
              )}
              {delivered && (
                <div className="mb-3 py-2 px-3 rounded-lg border border-[rgba(127,209,168,.3)] bg-[rgba(127,209,168,.1)] text-ar-green text-[12px] text-center">
                  Kode terkirim ke {loginId.includes("@") ? "email" : "nomor HP"} Anda.
                </div>
              )}
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                placeholder="••••••"
                className="w-full py-[15px] bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[22px] tracking-[0.5em] text-center font-display"
              />
              <div className="min-h-[19px] text-[11.5px] text-ar-red mt-2">{error}</div>
              <button
                disabled={busy || otp.length < 6}
                onClick={verifyOtp}
                className="w-full mt-[14px] py-[15px] ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60"
              >
                Verifikasi &amp; Masuk
              </button>
              <button
                onClick={() => {
                  setStep("id");
                  setOtp("");
                  setError("");
                }}
                className="w-full mt-[9px] py-[11px] bg-transparent text-ar-dim text-[11.5px] cursor-pointer"
              >
                Ganti email / nomor
              </button>
            </div>
          )}

          {step === "gps" && (
            <div>
              <div className="flex items-center gap-3 mb-[18px]">
                <span className="w-[9px] h-[9px] rounded-full bg-ar-gold ar-pulse" />
                <span className="text-xs tracking-[0.1em] uppercase text-ar-gold">
                  Absensi otomatis berjalan
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {gpsSteps.map((s) => (
                  <div
                    key={s.label}
                    className="flex justify-between gap-3 py-3 px-3.5 bg-ar-surface2 border border-ar-line rounded-[10px] text-[12.5px]"
                  >
                    <span className="text-ar-dim">{s.label}</span>
                    <span className="text-ar-gold text-right">{s.value}</span>
                  </div>
                ))}
              </div>
              <button
                disabled={!gpsReady}
                onClick={() => router.push("/app")}
                className="w-full mt-4 py-[15px] ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60"
              >
                Masuk ke Aplikasi
              </button>
            </div>
          )}
        </div>
        </div>

        <div className="mt-7 text-center">
          <div className="text-[10px] tracking-[0.32em] uppercase ar-shimmer-gold font-semibold">
            Professional &middot; Trusted &middot; Together
          </div>
          <div className="ar-tagline-underline" />
        </div>

        <div className="mt-5 flex justify-center">
          <a
            href="/downloads/arcorp.apk"
            download
            className="text-[10px] tracking-[0.14em] uppercase text-ar-gold border border-ar-goldline rounded-full px-4 py-2 hover:bg-ar-goldfill transition"
          >
            ⬇ Unduh Aplikasi Android (APK)
          </a>
        </div>

        <div className="mt-5 text-center text-[9px] tracking-[0.15em] text-ar-faint opacity-50">
          Project By : AR
        </div>
      </div>
    </div>
  );
}
