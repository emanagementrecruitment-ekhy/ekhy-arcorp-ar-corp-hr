import { useId } from "react";
import { PATHS, type IconName } from "@/components/ui/Icon";

/**
 * A raised 3D tile for the admin menu. It reuses the line-icon glyphs: the glyph is drawn three times (two dark
 * copies stepped down-right as the extrusion, then the lit gold face with a thin highlight), so every menu gets the
 * same depth without 16 separate illustrations. Colors come from the accent variables, so a dashboard theme change
 * recolors it. Motion (tilt on hover, slow float when active) lives in globals.css under `.icon3d`.
 */
export default function Icon3D({ name }: { name: IconName }) {
  const gradientId = `i3d${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const glyph = PATHS[name];
  return (
    <span className="icon3d" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className="icon3d-svg">
        <defs>
          {/* userSpaceOnUse: a plain vertical or horizontal line has no area, which would hide a bounding-box gradient */}
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
            <stop offset="0" style={{ stopColor: "var(--ar-accent-bright)" }} />
            <stop offset="0.55" style={{ stopColor: "rgb(var(--ar-accent-rgb))" }} />
            <stop offset="1" style={{ stopColor: "var(--ar-accent-dark)" }} />
          </linearGradient>
        </defs>
        <g strokeWidth="2.1" opacity="0.5" transform="translate(1.4 1.6)" style={{ stroke: "var(--ar-accent-dark)" }}>
          {glyph}
        </g>
        <g strokeWidth="2.1" opacity="0.85" transform="translate(0.8 0.95)" style={{ stroke: "var(--ar-accent-dark)" }}>
          {glyph}
        </g>
        <g strokeWidth="2.1" stroke={`url(#${gradientId})`}>
          {glyph}
        </g>
        <g strokeWidth="0.55" opacity="0.5" transform="translate(-0.3 -0.35)" style={{ stroke: "#fff" }}>
          {glyph}
        </g>
      </svg>
    </span>
  );
}
