import { cn } from "@/lib/utils";

const PALETTE = [
  "var(--color-vitral-red)",
  "var(--color-vitral-orange)",
  "var(--color-vitral-amber)",
  "var(--color-vitral-yellow)",
  "var(--color-vitral-green)",
  "var(--color-vitral-sky)",
  "var(--color-vitral-blue)",
  "var(--color-vitral-cream)",
];

interface Ring {
  inner: number;
  outer: number;
  segments: number;
  offset: number;
  colorShift: number;
}

const RINGS: Ring[] = [
  { inner: 34, outer: 78, segments: 8, offset: 0, colorShift: 0 },
  { inner: 78, outer: 128, segments: 16, offset: 0.5, colorShift: 3 },
  { inner: 128, outer: 168, segments: 24, offset: 0, colorShift: 5 },
  { inner: 168, outer: 196, segments: 48, offset: 0.5, colorShift: 1 },
];

const CENTER = 200;
const LEAD = "var(--color-vitral-ink)";

function polar(r: number, angle: number): [number, number] {
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Builds an annular sector path between two radii and two angles. */
function sectorPath(r1: number, r2: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r2, a0);
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r1, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M${fmt(x0)} ${fmt(y0)}`,
    `A${r2} ${r2} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`,
    `L${fmt(x2)} ${fmt(y2)}`,
    `A${r1} ${r1} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)}`,
    "Z",
  ].join(" ");
}

interface Pane {
  d: string;
  fill: string;
}

function buildPanes(): Pane[] {
  const panes: Pane[] = [];
  RINGS.forEach((ring, ringIndex) => {
    const step = (Math.PI * 2) / ring.segments;
    for (let i = 0; i < ring.segments; i++) {
      const a0 = (i + ring.offset) * step - Math.PI / 2;
      const a1 = a0 + step;
      // Outermost ring alternates cream with color to read like a lit border.
      const fill =
        ringIndex === RINGS.length - 1 && i % 2 === 1
          ? "var(--color-vitral-cream)"
          : PALETTE[(i + ring.colorShift) % PALETTE.length];
      panes.push({ d: sectorPath(ring.inner, ring.outer, a0, a1), fill });
    }
  });
  return panes;
}

const PANES = buildPanes();

interface StainedGlassRoseProps {
  className?: string;
}

/** Decorative rose window built from the logo palette. */
export function StainedGlassRose({ className }: StainedGlassRoseProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="Rosetón de vitral con los colores de ComunidadCat"
    >
      <defs>
        <radialGradient id="rose-sheen" cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
        <radialGradient id="rose-core" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff6b8" />
          <stop offset="60%" stopColor="var(--color-vitral-yellow)" />
          <stop offset="100%" stopColor="var(--color-vitral-amber)" />
        </radialGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={199} fill={LEAD} />

      <g className="vitral-spin">
        {PANES.map((pane, i) => (
          <path
            key={i}
            d={pane.d}
            fill={pane.fill}
            stroke={LEAD}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        ))}
      </g>

      <circle
        cx={CENTER}
        cy={CENTER}
        r={196}
        fill="url(#rose-sheen)"
        className="vitral-glow"
        pointerEvents="none"
      />
      <circle cx={CENTER} cy={CENTER} r={34} fill="url(#rose-core)" stroke={LEAD} strokeWidth={7} />
      <circle cx={CENTER - 9} cy={CENTER - 10} r={8} fill="#fff" opacity={0.7} />
    </svg>
  );
}
