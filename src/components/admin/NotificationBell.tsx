"use client";

import { useEffect, useRef, useState } from "react";
import { SOUNDS, playSound, unlockAudioOnFirstGesture, countNewUnread, type SoundId } from "@/lib/notif-sound";

interface Notif {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

const SOUND_KEY = "arcorp_notif_sound";

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [sound, setSound] = useState<SoundId>(() => {
    try {
      const saved = localStorage.getItem(SOUND_KEY) as SoundId | null;
      if (saved && SOUNDS.some((s) => s.id === saved)) return saved;
    } catch {
      // localStorage unavailable (private mode, etc.) — fall through to the default.
    }
    return "lembut";
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  function load() {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => {
        setUnreadCount(d.unreadCount ?? 0);
        const list: Notif[] = d.notifications ?? [];
        setNotifications(list);
        const fresh = countNewUnread(seenIds.current, list);
        // The very first load only records what is already there — it must not ring for old items.
        if (!isFirstLoad.current && fresh > 0) playSound(sound);
        isFirstLoad.current = false;
      })
      .catch(() => {});
  }

  useEffect(() => unlockAudioOnFirstGesture(), []);

  useEffect(() => {
    load();
    // Short poll — this app has no push transport, so this is what makes
    // the bell feel live instead of requiring a manual refresh.
    // 15s is still quick enough for a chime, and we skip the request while the tab
    // is hidden (a background tab polling every few seconds was making the server slow).
    const tick = () => {
      if (!document.hidden) load();
    };
    const id = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) setShowSettings(false);
    if (next && unreadCount > 0) {
      await fetch("/api/admin/notifications", { method: "POST" });
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    }
  }

  function chooseSound(id: SoundId) {
    setSound(id);
    try {
      localStorage.setItem(SOUND_KEY, id);
    } catch {
      // Ignore — preference just won't persist across visits on this device.
    }
    playSound(id);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        className="relative w-9 h-9 grid place-items-center rounded-full bg-ar-surface2 border border-ar-line cursor-pointer text-ar-dim"
        aria-label="Notifikasi"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-ar-red text-white text-[9px] font-bold grid place-items-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} top-[calc(100%+8px)] w-[300px] max-w-[calc(100vw-2rem)] max-h-[420px] overflow-y-auto bg-ar-surface border border-ar-line rounded-2xl shadow-lg z-50 p-2`}>
          <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1 border-b border-ar-line">
            <span className="text-[10px] tracking-[0.1em] uppercase text-ar-dim">Notifikasi</span>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="text-[10.5px] text-ar-gold cursor-pointer"
            >
              🔊 Suara
            </button>
          </div>

          {showSettings && (
            <div className="p-2.5 mb-1.5 bg-ar-surface2 rounded-[10px] flex flex-col gap-1.5">
              <div className="text-[10px] text-ar-dim mb-0.5">Dering notifikasi di HP ini</div>
              {SOUNDS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseSound(s.id)}
                  className={`text-left py-1.5 px-2.5 rounded-[8px] text-[11.5px] cursor-pointer ${
                    sound === s.id ? "bg-ar-goldfill text-ar-gold2" : "text-ar-dim"
                  }`}
                >
                  {s.label} {sound === s.id && "✓"}
                </button>
              ))}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-ar-faint">Belum ada notifikasi.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-2.5 rounded-[10px] hover:bg-ar-surface2">
                <div className="text-[12px] text-ar-text">{n.text}</div>
                <div className="text-[10px] text-ar-dim mt-1">{n.time}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
