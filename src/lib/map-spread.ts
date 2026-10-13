// Pins that share the exact same coordinates (everyone whose registered location is the head office, or no GPS yet)
// would sit on top of each other and look "stuck" as one dot. This returns a pixel offset per pin so they fan out
// in rings around the shared point; the real coordinates are never changed.

export interface SpreadInput {
  id: string;
  lat: number;
  lng: number;
}

const PER_RING = 8;
const FIRST_RING_PX = 40;
const RING_STEP_PX = 30;

function key(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/** Pixel offset [x, y] for each id. A lone pin gets [0, 0]; the head office keeps the centre slot of its own spot. */
export function spreadOffsets(hq: { lat: number; lng: number }, pins: SpreadInput[]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const groups = new Map<string, SpreadInput[]>();
  for (const p of pins) {
    const k = key(p.lat, p.lng);
    const g = groups.get(k);
    if (g) g.push(p);
    else groups.set(k, [p]);
  }
  const hqKey = key(hq.lat, hq.lng);
  for (const [k, g] of groups) {
    const hasHq = k === hqKey;
    if (g.length === 1 && !hasHq) {
      out.set(g[0].id, [0, 0]);
      continue;
    }
    g.forEach((p, i) => {
      const ring = Math.floor(i / PER_RING);
      const pos = i % PER_RING;
      const inRing = Math.min(PER_RING, g.length - ring * PER_RING);
      const radius = FIRST_RING_PX + ring * RING_STEP_PX;
      const angle = -Math.PI / 2 + (pos / inRing) * 2 * Math.PI + (ring % 2 ? Math.PI / inRing : 0);
      out.set(p.id, [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)]);
    });
  }
  return out;
}
