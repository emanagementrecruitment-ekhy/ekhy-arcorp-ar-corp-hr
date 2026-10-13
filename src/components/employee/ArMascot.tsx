// "Ara" — the AR Corp doll mascot, drawn as inline SVG so it stays crisp at any size and needs no image file.
// The mood only changes small details (eyes/mouth), animated by the .arc-mascot-* rules in globals.css.

export type MascotMood = "idle" | "thinking" | "talking";

export default function ArMascot({ size = 56, mood = "idle", className = "" }: { size?: number; mood?: MascotMood; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Ara, asisten AR Corp"
      className={`arc-mascot arc-mascot-${mood} ${className}`}
    >
      <defs>
        <linearGradient id="arcGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5dfa5" />
          <stop offset="1" stopColor="#c9993f" />
        </linearGradient>
        <radialGradient id="arcSkin" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#fbe3cc" />
          <stop offset="1" stopColor="#efc4a2" />
        </radialGradient>
      </defs>

      {/* body: black jacket with a gold AR badge */}
      <path d="M22 118c2-20 16-30 38-30s36 10 38 30z" fill="#14161d" />
      <path d="M48 88l12 12 12-12" fill="none" stroke="url(#arcGold)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="60" cy="108" r="7" fill="url(#arcGold)" />
      <text x="60" y="111.2" textAnchor="middle" fontSize="7.6" fontWeight="700" fontFamily="Georgia, serif" fill="#17110a">AR</text>

      {/* neck */}
      <rect x="53" y="78" width="14" height="12" rx="5" fill="#efc4a2" />

      {/* hair behind the head */}
      <path d="M20 58c0-26 17-42 40-42s40 16 40 42c0 14-4 24-10 30-1-12-6-22-14-26-12 4-34 4-46 0-8 4-13 14-14 26-4-6-6-16-6-30z" fill="#15151c" />

      {/* head */}
      <ellipse cx="60" cy="56" rx="31" ry="30" fill="url(#arcSkin)" />

      {/* fringe */}
      <path d="M29 52c2-18 15-28 31-28s29 10 31 28c-8-9-20-14-31-14S37 43 29 52z" fill="#15151c" />
      <path d="M44 31c6-3 16-4 24-1" stroke="#3a3a48" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* gold bow */}
      <g transform="translate(84 28) rotate(18)">
        <path d="M0 0c-9-8-15-4-14 3 1 6 8 7 14-3z" fill="url(#arcGold)" />
        <path d="M0 0c9-8 15-4 14 3-1 6-8 7-14-3z" fill="url(#arcGold)" />
        <circle cx="0" cy="0" r="3.6" fill="#a87a2a" />
      </g>

      {/* eyes */}
      <g className="arc-mascot-eyes">
        <ellipse cx="47" cy="58" rx="5.2" ry="6.4" fill="#1b1b24" />
        <ellipse cx="73" cy="58" rx="5.2" ry="6.4" fill="#1b1b24" />
        <circle cx="48.8" cy="55.6" r="1.9" fill="#fff" />
        <circle cx="74.8" cy="55.6" r="1.9" fill="#fff" />
      </g>

      {/* cheeks */}
      <ellipse cx="38" cy="68" rx="5" ry="3" fill="#f2a28f" opacity="0.55" />
      <ellipse cx="82" cy="68" rx="5" ry="3" fill="#f2a28f" opacity="0.55" />

      {/* mouth */}
      <path className="arc-mascot-mouth" d="M53 71c3 4.5 11 4.5 14 0" fill="none" stroke="#a5523f" strokeWidth="2.4" strokeLinecap="round" />

      {/* thinking dots */}
      <g className="arc-mascot-dots" fill="#d6ae5f">
        <circle cx="96" cy="18" r="2.6" />
        <circle cx="104" cy="11" r="3.2" />
        <circle cx="113" cy="5" r="3.8" />
      </g>
    </svg>
  );
}
