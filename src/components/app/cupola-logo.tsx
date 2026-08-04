/** Cupola dome network icon — architectural dome built from intersecting data nodes */
export function CupolaIcon({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <filter id="cupola-apex-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── structural lines ─────────────────────────────────── */}
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* outer arc — right side */}
        <line x1="18" y1="6" x2="25" y2="9"  strokeWidth="1.1" />
        <line x1="25" y1="9" x2="30" y2="17" strokeWidth="1.1" />
        <line x1="30" y1="17" x2="32" y2="28" strokeWidth="1.1" />
        {/* outer arc — left side */}
        <line x1="18" y1="6"  x2="11" y2="9"  strokeWidth="1.1" />
        <line x1="11" y1="9"  x2="6"  y2="17" strokeWidth="1.1" />
        <line x1="6"  y1="17" x2="4"  y2="28" strokeWidth="1.1" />
        {/* horizontal ribs */}
        <line x1="11" y1="9"  x2="25" y2="9"  strokeWidth="1.1" />
        <line x1="6"  y1="17" x2="30" y2="17" strokeWidth="1.1" />
        {/* base line */}
        <line x1="4"  y1="28" x2="32" y2="28" strokeWidth="1.1" />
        {/* vertical spine */}
        <line x1="18" y1="6"  x2="18" y2="28" strokeWidth="1.1" />
        {/* network diagonals — the data-graph feel */}
        <line x1="18" y1="6"  x2="30" y2="17" strokeWidth="0.7" opacity="0.55" />
        <line x1="18" y1="6"  x2="6"  y2="17" strokeWidth="0.7" opacity="0.55" />
        <line x1="25" y1="9"  x2="18" y2="17" strokeWidth="0.7" opacity="0.48" />
        <line x1="11" y1="9"  x2="18" y2="17" strokeWidth="0.7" opacity="0.48" />
        <line x1="30" y1="17" x2="18" y2="28" strokeWidth="0.7" opacity="0.42" />
        <line x1="6"  y1="17" x2="18" y2="28" strokeWidth="0.7" opacity="0.42" />
      </g>

      {/* ── network nodes ─────────────────────────────────────── */}
      <g fill="currentColor">
        <circle cx="25" cy="9"  r="1.5" />
        <circle cx="30" cy="17" r="1.5" />
        <circle cx="32" cy="28" r="1.5" />
        <circle cx="11" cy="9"  r="1.5" />
        <circle cx="6"  cy="17" r="1.5" />
        <circle cx="4"  cy="28" r="1.5" />
        <circle cx="18" cy="9"  r="1.3" opacity="0.85" />
        <circle cx="18" cy="17" r="1.3" opacity="0.85" />
        <circle cx="18" cy="28" r="1.3" opacity="0.85" />
      </g>

      {/* ── apex: the central "boss" node, glowing ────────────── */}
      <circle
        cx="18"
        cy="6"
        r="2.6"
        fill="currentColor"
        filter="url(#cupola-apex-glow)"
      />
    </svg>
  );
}
