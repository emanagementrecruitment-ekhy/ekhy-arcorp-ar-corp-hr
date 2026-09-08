"use client";

import { useEffect, useRef, useState } from "react";

interface Notif {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => {
        setUnreadCount(d.unreadCount ?? 0);
        setNotifications(d.notifications ?? []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/admin/notifications", { method: "POST" });
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    }
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
        <div className="absolute right-0 top-[calc(100%+8px)] w-[300px] max-h-[360px] overflow-y-auto bg-ar-surface border border-ar-line rounded-2xl shadow-lg z-50 p-2">
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
