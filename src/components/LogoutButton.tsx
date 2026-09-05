"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({ className, label = "Keluar" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} disabled={busy} className={className}>
      {label}
    </button>
  );
}
