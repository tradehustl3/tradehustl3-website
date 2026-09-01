import type { SVGProps } from "react";
import type { TradeTrack } from "./trade-content";

type HeroTextureTrade = TradeTrack | "main";
type Glyph =
  | "bolt"
  | "clipboard"
  | "conduit"
  | "fan"
  | "gauge"
  | "gloves"
  | "hammer"
  | "helmet"
  | "ladder"
  | "level"
  | "multimeter"
  | "pipe"
  | "plug"
  | "saw"
  | "toolbox"
  | "torch"
  | "valve"
  | "weld"
  | "wrench";

const GLYPHS: Record<HeroTextureTrade, [Glyph, Glyph, Glyph]> = {
  main: ["toolbox", "wrench", "clipboard"],
  "HVAC & Refrigeration": ["gauge", "fan", "wrench"],
  Electrical: ["multimeter", "plug", "conduit"],
  Plumbing: ["wrench", "valve", "pipe"],
  "Welding & Fabrication": ["torch", "helmet", "weld"],
  "Construction & Carpentry": ["hammer", "level", "saw"],
  "Facilities Maintenance": ["toolbox", "clipboard", "ladder"],
  "General Labor / Trade Helper": ["toolbox", "wrench", "gloves"],
};

function IconGlyph({ name, ...props }: SVGProps<SVGSVGElement> & { name: Glyph }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" {...props}>
      <g {...common}>
        {name === "bolt" && <path d="M13 2 5.5 13h6L10.7 22 18.5 10h-6L13 2Z" />}
        {name === "clipboard" && <><path d="M9 5H6v16h12V5h-3" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h5" /></>}
        {name === "conduit" && <><path d="M3 18V9a4 4 0 0 1 4-4h14" /><path d="M3 14h5a3 3 0 0 0 3-3V5" /></>}
        {name === "fan" && <><circle cx="12" cy="12" r="2" /><path d="M12 10c-1-5 1-7 3-7 3 0 4 4 1 7M14 12c5-1 7 1 7 3 0 3-4 4-7 1M12 14c1 5-1 7-3 7-3 0-4-4-1-7M10 12c-5 1-7-1-7-3 0-3 4-4 7-1" /></>}
        {name === "gauge" && <><path d="M4 19a8 8 0 1 1 16 0" /><path d="m12 15 4-5M7 19h10M6 13h1M17 13h1M12 7v1" /></>}
        {name === "gloves" && <><path d="M7 21c-2 0-3-2-3-4v-7c0-1 2-1 2 0v4-8c0-1 2-1 2 0v7-9c0-1 2-1 2 0v9-8c0-1 2-1 2 0v9l2-3c1-1 3 0 2 2l-3 6c-1 2-3 2-6 2Z" /><path d="M16 7v7" /></>}
        {name === "hammer" && <><path d="m14 5 5 5M16 3l5 5-3 3-5-5 3-3ZM14 8 4 18l2 2 10-10" /></>}
        {name === "helmet" && <><path d="M4 15a8 8 0 0 1 16 0v4H4v-4Z" /><path d="M9 15V7M15 15V7M2 19h20" /></>}
        {name === "ladder" && <><path d="M6 22 9 2M18 22 15 2M7 17h10M8 12h8M9 7h6" /></>}
        {name === "level" && <><rect x="2" y="8" width="20" height="8" rx="1" /><circle cx="12" cy="12" r="2" /><path d="M5 12h2M17 12h2" /></>}
        {name === "multimeter" && <><rect x="5" y="2" width="14" height="18" rx="2" /><rect x="8" y="5" width="8" height="5" rx="1" /><circle cx="12" cy="14" r="2" /><path d="M8 18h1M15 18h1M7 20l-2 2M17 20l2 2" /></>}
        {name === "pipe" && <><path d="M3 5h7v5h4V5h7M6 5V2M18 5V2M10 8H7a4 4 0 0 0-4 4v7M14 8h3a4 4 0 0 1 4 4v7" /></>}
        {name === "plug" && <><path d="M8 3v5M16 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v5" /></>}
        {name === "saw" && <><path d="M3 16 16 3l5 5L8 21l-5-5Z" /><path d="m9 14 1 3 2-1 1 3 2-1" /></>}
        {name === "toolbox" && <><rect x="2" y="8" width="20" height="12" rx="2" /><path d="M8 8V5h8v3M2 13h20M10 12v3h4v-3" /></>}
        {name === "torch" && <><path d="m7 21 6-10 4 2-6 10M13 11l2-5 4 2-2 5M16 6l2-4M19 8l3-2" /><path d="M5 5c2 0 2 3 4 3" /></>}
        {name === "valve" && <><circle cx="12" cy="12" r="3" /><path d="M12 9V5M12 15v4M9 12H3M15 12h6M8 5h8M12 2v3" /></>}
        {name === "weld" && <><path d="M3 15h18M5 11l2 4 2-4 2 4 2-4 2 4 2-4 2 4" /><path d="m6 6-1-2M12 6V3M18 6l1-2" /></>}
        {name === "wrench" && <path d="M14 6a5 5 0 0 0-7 6L2 17l5 5 5-5a5 5 0 0 0 6-7l-3 3-4-4 3-3Z" />}
      </g>
    </svg>
  );
}

export function ResumeHeroTexture({ trade = "main" }: { trade?: HeroTextureTrade }) {
  const [primary, secondaryLeft, secondaryRight] = GLYPHS[trade];

  return (
    <div className="rb-hero-texture" aria-hidden="true">
      <span className="rb-hero-glow" />
      <IconGlyph className="rb-hero-icon rb-hero-icon-primary" name={primary} focusable="false" />
      <IconGlyph className="rb-hero-icon rb-hero-icon-left" name={secondaryLeft} focusable="false" />
      <IconGlyph className="rb-hero-icon rb-hero-icon-right" name={secondaryRight} focusable="false" />
    </div>
  );
}
