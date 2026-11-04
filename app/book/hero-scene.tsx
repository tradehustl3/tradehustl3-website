/**
 * Decorative background for the /book hero: a jobsite "building" the book.
 *
 * Original silhouettes drawn for TRADE HUSTL3 (no stock art, no real people).
 * Two layers so the composition holds at every width:
 *  - left: scaffolding rising behind the cover, a worker up top with a wrench,
 *    and a red spray-painted tag with drips across the wall;
 *  - right: a painter spraying the wall and a welder throwing sparks, faded
 *    behind the headline.
 *
 * Purely visual: aria-hidden, no text, no links, nothing focusable. Inline SVG,
 * so it adds no image requests. Fading, masking, and the phone layout live in
 * page-shell.css (.book-hero-scene*).
 */

const FIGURE = "var(--hero-figure)";

/** Thick round strokes read as solid silhouettes at this scale. */
const limb = { fill: "none", stroke: FIGURE, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function HardHat({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <circle r="27" fill={FIGURE} />
      <path d="M-31 -8 C-31 -42 31 -42 31 -8 L42 -8 L42 1 L-35 1 Z" fill={FIGURE} />
    </g>
  );
}

/** Spray-paint grain: punches the stroke into speckles like a rattle can. */
function SprayFilter({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} x="-20%" y="-40%" width="140%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={seed} result="grain" />
      <feColorMatrix in="grain" type="saturate" values="0" result="mono" />
      <feComponentTransfer in="mono" result="dots">
        <feFuncA type="discrete" tableValues="0 0 1 1 1" />
      </feComponentTransfer>
      <feComposite in="SourceGraphic" in2="dots" operator="in" />
    </filter>
  );
}

export function BookHeroScene() {
  return (
    <div className="book-hero-scene" aria-hidden="true">
      <svg className="book-hero-scene-left" viewBox="0 0 760 1000" preserveAspectRatio="xMinYMin meet" focusable="false">
        <defs>
          <SprayFilter id="hero-spray-left" seed={7} />
        </defs>

        {/* Red tag sprayed across the wall, with drips. */}
        <g className="book-hero-scene-paint">
          <path
            d="M-30 112 C 100 64, 230 160, 370 104 S 560 66, 640 112"
            fill="none"
            stroke="var(--hero-red)"
            strokeWidth="70"
            strokeLinecap="round"
            filter="url(#hero-spray-left)"
          />
          <g fill="var(--hero-red)">
            <rect x="110" y="112" width="8" height="104" rx="4" />
            <rect x="250" y="128" width="6" height="62" rx="3" />
            <rect x="452" y="92" width="9" height="128" rx="4.5" />
          </g>
        </g>

        {/* Scaffold rising behind the cover: the frame the book is "built" on. */}
        <g className="book-hero-scene-scaffold" stroke={FIGURE} fill="none">
          <path strokeWidth="11" d="M40 1000 V250 M720 1000 V250 M40 250 H720 M40 560 H720 M40 860 H720" />
          <path strokeWidth="6" d="M40 250 L720 560 M720 250 L40 560 M40 560 L720 860 M720 560 L40 860" />
          <rect x="24" y="232" width="712" height="24" fill={FIGURE} stroke="none" />
        </g>

        {/* Worker up on the top plank, wrench raised. */}
        <g className="book-hero-scene-figure">
          <HardHat x={360} y={120} />
          <path {...limb} strokeWidth="50" d="M360 158 L352 216" />
          <path {...limb} strokeWidth="24" d="M352 220 L328 232 M352 220 L380 232" />
          <path {...limb} strokeWidth="19" d="M362 172 L408 140 L430 92 M348 174 L312 206" />
          <path fill={FIGURE} d="M422 100 l12 -52 l20 4 l-4 20 l14 6 l-6 16 l-16 -4 l-4 14 Z" />
        </g>
      </svg>

      <svg className="book-hero-scene-right" viewBox="0 0 640 1000" preserveAspectRatio="xMaxYMax meet" focusable="false">
        <defs>
          <SprayFilter id="hero-spray-right" seed={12} />
          <radialGradient id="hero-mist" cx="0.2" cy="0.55" r="0.8">
            <stop offset="0" stopColor="var(--hero-red)" stopOpacity="0.6" />
            <stop offset="1" stopColor="var(--hero-red)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-spark" r="0.5">
            <stop offset="0" stopColor="var(--hero-gold)" stopOpacity="0.95" />
            <stop offset="1" stopColor="var(--hero-gold)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gold overspray the painter is laying down. */}
        <g className="book-hero-scene-paint">
          <ellipse cx="260" cy="150" rx="220" ry="110" fill="url(#hero-mist)" />
          <path
            d="M90 140 C 180 92, 270 176, 370 122"
            fill="none"
            stroke="var(--hero-gold)"
            strokeWidth="46"
            strokeLinecap="round"
            filter="url(#hero-spray-right)"
          />
          <g fill="var(--hero-gold)">
            <rect x="170" y="128" width="6" height="66" rx="3" />
            <rect x="300" y="146" width="7" height="88" rx="3.5" />
          </g>
        </g>

        {/* Painter facing the wall, spray gun up, hose to the pot. */}
        <g className="book-hero-scene-figure">
          <HardHat x={500} y={360} flip />
          <path {...limb} strokeWidth="62" d="M502 404 L512 560" />
          <path {...limb} strokeWidth="30" d="M508 570 L476 700 L460 820 M518 570 L560 700 L572 820" />
          <path {...limb} strokeWidth="22" d="M492 426 L452 350 L420 262 M508 430 L470 482 L420 452" />
          <path fill={FIGURE} d="M370 214 h62 v26 h-16 l-8 48 h-16 l6 -48 h-28 Z" />
          <path {...limb} strokeWidth="7" d="M420 452 C 440 560, 520 600, 560 760" />
          <rect x="534" y="744" width="54" height="80" rx="10" fill={FIGURE} />
          <path fill={FIGURE} d="M440 820 h60 v18 h-60 Z M548 820 h62 v18 h-62 Z" />
        </g>

        {/* Welder crouched low, mask down, sparks flying. */}
        <g className="book-hero-scene-figure">
          <circle cx="210" cy="900" r="90" fill="url(#hero-spark)" />
          <g stroke="var(--hero-gold)" strokeWidth="3.5" strokeLinecap="round">
            <path d="M210 900 l-70 -56 M210 900 l-28 -86 M210 900 l36 -78 M210 900 l-88 -6 M210 900 l-54 46 M210 900 l78 -34" />
          </g>
          <path fill={FIGURE} d="M300 820 c0 -34 54 -42 60 -6 l4 42 h-66 Z" />
          <path {...limb} strokeWidth="58" d="M330 870 L378 950" />
          <path {...limb} strokeWidth="30" d="M378 956 L316 978 L306 1010 M386 960 L420 1010" />
          <path {...limb} strokeWidth="22" d="M320 878 L270 900 L226 896" />
          <path fill={FIGURE} d="M150 1000 h260 v-30 h-260 Z" />
        </g>
      </svg>
    </div>
  );
}
