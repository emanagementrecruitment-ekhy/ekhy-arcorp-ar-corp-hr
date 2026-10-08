"use client";

import { useEffect, useRef, useState } from "react";
import { PING_INTERVAL_MS, MAX_ACCURACY_M } from "@/lib/live-location";

type State = "starting" | "on" | "denied" | "unavailable";

/**
 * Sends the phone's position to the head office about once a minute while the
 * app is open and visible, and shows a small notice so staff always know it is
 * on. It cannot run when the app is closed or the screen is off (a browser/TWA
 * limit), and it never displays coordinates.
 */
export default function LiveLocationPing() {
  const [state, setState] = useState<State>("starting");
  const lastSentRef = useRef(0);

  useEffect(() => {
    // No geolocation API at all: nothing to send and nothing to show.
    if (!("geolocation" in navigator)) return;
    let stopped = false;

    function send() {
      if (stopped || document.visibilityState !== "visible") return;
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (stopped) return;
          if (p.coords.accuracy > MAX_ACCURACY_M) return;
          setState("on");
          const now = Date.now();
          if (now - lastSentRef.current < PING_INTERVAL_MS / 2) return;
          lastSentRef.current = now;
          fetch("/api/attendance/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
          }).catch(() => {});
        },
        (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 30_000 }
      );
    }

    send();
    const id = setInterval(send, PING_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && send();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (state === "starting") return null;
  const on = state === "on";
  return (
    <div
      role="status"
      className={`mb-3 flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[10.5px] leading-[1.5] ${
        on ? "border-ar-line bg-ar-surface2 text-ar-dim" : "border-ar-red/40 bg-ar-red/10 text-ar-red"
      }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-ar-green" : "bg-ar-red"}`} />
      {on
        ? "Lokasi aktif: posisi Anda terbaca kantor pusat selama aplikasi terbuka."
        : state === "denied"
          ? "Izin lokasi mati. Nyalakan lokasi untuk aplikasi ini agar absensi terbaca."
          : "Lokasi tidak tersedia di perangkat ini."}
    </div>
  );
}
