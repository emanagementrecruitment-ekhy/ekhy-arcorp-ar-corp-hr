export type SoundId = "lembut" | "dering" | "tegas" | "senyap";

export const SOUNDS: { id: SoundId; label: string; tones: { freq: number; duration: number }[] }[] = [
  { id: "lembut", label: "Lembut", tones: [{ freq: 660, duration: 0.16 }] },
  { id: "dering", label: "Dering", tones: [{ freq: 784, duration: 0.12 }, { freq: 988, duration: 0.16 }] },
  { id: "tegas", label: "Tegas", tones: [{ freq: 523, duration: 0.1 }, { freq: 523, duration: 0.1 }, { freq: 659, duration: 0.22 }] },
  { id: "senyap", label: "Senyap", tones: [] },
];

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/**
 * Browsers keep an AudioContext "suspended" until the user has interacted with the
 * page, so a notification that arrives while nobody has clicked yet would be silent.
 * Call once: the first click/key/touch resumes the shared context.
 */
export function unlockAudioOnFirstGesture(): () => void {
  if (typeof window === "undefined") return () => {};
  const resume = () => {
    void getCtx()?.resume();
    remove();
  };
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, resume));
  events.forEach((e) => window.addEventListener(e, resume, { passive: true }));
  return remove;
}

/** Synthesizes a short beep pattern with the Web Audio API — no audio file needed, works offline. */
export function playSound(id: SoundId) {
  const preset = SOUNDS.find((s) => s.id === id);
  const c = getCtx();
  if (!preset || preset.tones.length === 0 || !c) return;
  void c.resume();
  let t = c.currentTime;
  for (const { freq, duration } of preset.tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
    t += duration + 0.05;
  }
}

/**
 * How many unread notifications in `list` have not been seen before. Counting every new
 * unread id (not just comparing the newest one) means two logins arriving between polls
 * still ring, and an already-seen item never rings twice.
 */
export function countNewUnread(seen: Set<string>, list: { id: string; read: boolean }[]): number {
  let n = 0;
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      if (!item.read) n++;
    }
  }
  return n;
}
