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
      setDelivered(Boolean(data.delivered));
      setOtp("");
      setStep("otp");
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
      } else {
        router.push("/admin");
      }
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
    <div className="min-h-screen grid place-items-center p-5 sm:p-10 ar-glow">
      <div className="w-full max-w-[430px] ar-in">
        <div className="flex flex-col items-center gap-3.5 mb-6">
          <Image
            src="/ar-corp-logo.png"
            alt="AR Corp"
            width={104}
            height={104}
            className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
          />
          <div className="text-center">
            <div className="font-display text-[17px] tracking-[0.42em] text-ar-gold uppercase font-bold">
              E-MANAGEMENT
            </div>
            <div className="text-[10.5px] tracking-[0.24em] text-ar-dim mt-1.5 uppercase">
              Operations Portal Check Your Slip Pay
            </div>
          </div>
        </div>

        <div className="bg-ar-surface border border-ar-goldline rounded-[18px] px-[26px] pt-7 pb-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]">
          <div className="grid grid-cols-2 gap-2 p-[5px] bg-ar-surface2 rounded-xl mb-[22px]">
            <button
              onClick={() => pickPortal("karyawan")}
              className={`py-[11px] rounded-[9px] text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer transition ${
                portal === "karyawan" ? "bg-ar-goldfill text-ar-gold2 shadow-[inset_0_0_0_1px_var(--ar-goldline)]" : "text-ar-dim"
              }`}
            >
              STAFF &amp; PR
            </button>
            <button
              onClick={() => pickPortal("pusat")}
              className={`py-[11px] rounded-[9px] text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer transition ${
                portal === "pusat" ? "bg-ar-goldfill text-ar-gold2 shadow-[inset_0_0_0_1px_var(--ar-goldline)]" : "text-ar-dim"
              }`}
            >
              OFFICE
            </button>
          </div>

          {step === "id" && (
            <div>
              <div className="text-[10.5px] tracking-[0.16em] uppercase text-ar-dim mb-2.5 text-center">
                Login Dengan Email Terdaftar
              </div>
              <input
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                placeholder="YOUR GMAIL"
                className="w-full py-[14px] px-[15px] bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[10.5px] text-center"
              />
              <div className="min-h-[19px] text-[11.5px] text-ar-red mt-2">{error}</div>
              <button
                disabled={busy}
                onClick={sendOtp}
                className="w-full py-[15px] ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60"
              >
                Kirim Kode Verifikasi
              </button>
              <div className="mt-[18px] pt-4 border-t border-ar-line text-[11.5px] leading-[1.75] text-ar-dim text-center font-semibold">
                Akun demo — Karyawan <span className="text-ar-gold">ekhy@arcorp.id</span> · Pusat{" "}
                <span className="text-ar-gold">owner@arcorp.id</span>
                <br />
                Kode verifikasi dikirim ke konsol server (mode pengembangan).
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
                  Mode pengembangan — kode Anda: <strong>{devCode}</strong>
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
        <div className="text-center mt-[18px] text-[10.5px] tracking-[0.1em] text-ar-faint">
          https://emanagementrecruitment-ekhy.github.io
        </div>
      </div>
    </div>
  );
}
