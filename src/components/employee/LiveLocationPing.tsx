"use client";

import { useEffect, useRef, useState } from "react";
import { PING_INTERVAL_MS, MAX_ACCURACY_M } from "@/lib/live-location";

type State = "starting" | "on" | "denied" | "unavailable";

/**
 * Sends the phone's position to the head office about once a minute while the
 * app is open and visible, and shows only a tiny green dot while it is on. It cannot run when the app is closed or the screen is off (a browser/TWA
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

  // Only a tiny green dot in the status-bar corner (like the "location in use" indicator on food-delivery
  // apps) — no text. Nothing is shown when location is off or unavailable.
  if (state !== "on") return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed right-[10px] z-[80] h-[7px] w-[7px] rounded-full bg-ar-green shadow-[0_0_6px_var(--ar-green)]"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 7px)" }}
    />
  );
}
