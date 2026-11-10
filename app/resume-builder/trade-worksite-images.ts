import type { TradeTrack } from "./trade-content";

/**
 * Checked-in worksite photos for each trade, shared by the trade landing pages
 * and the homepage "Find Your Lane" cards so a photo and its alt text are
 * defined once.
 */
export type TradeWorksiteImage = { src: string; alt: string; width: number; height: number };

export const TRADE_WORKSITE_IMAGES: Partial<Record<TradeTrack, TradeWorksiteImage>> = {
  "HVAC & Refrigeration": {
    src: "/optimized/hvac-manifold-worksite.webp",
    alt: "HVAC manifold gauges connected to commercial equipment at an active worksite",
    width: 1400,
    height: 788,
  },
  "Facilities Maintenance": {
    src: "/trade-landings/facilities-maintenance-worksite.webp",
    alt: "Facilities maintenance tool cart, drill, ladders, and building materials in a commercial renovation corridor",
    width: 1536,
    height: 1024,
  },
  Electrical: {
    src: "/trade-landings/electrician-worksite.webp",
    alt: "Commercial electrical panel, multimeter, and insulated tools at a construction site",
    width: 1536,
    height: 1024,
  },
  Plumbing: {
    src: "/trade-landings/plumbing-drain-cleaner-worksite.webp",
    alt: "Plumber operating a wheeled auto-feed sewer auger at a commercial drain cleanout",
    width: 1536,
    height: 1024,
  },
  "Welding & Fabrication": {
    src: "/trade-landings/welding-female-pink-helmet-worksite.webp",
    alt: "Black female welder with a ponytail and pink welding helmet fabricating steel in an active shop",
    width: 1536,
    height: 1024,
  },
  "Construction & Carpentry": {
    src: "/trade-landings/construction-carpenter-framing-worksite.webp",
    alt: "Framing nail gun, speed square, carpenter pencil, and house plans at a residential framing site",
    width: 1536,
    height: 1024,
  },
  "Roadwork, Paving, Concrete & Heavy Equipment": {
    src: "/trade-landings/heavy-equipment-crane-hvac-hero.webp",
    alt: "Mobile construction crane lifting a large rooftop HVAC unit toward the roof of a commercial building, with construction crew guiding the lift",
    width: 1448,
    height: 1086,
  },
  "General Labor / Trade Helper": {
    src: "/trade-landings/general-labor-traffic-control-worksite.webp",
    alt: "Road construction flagger in a high-visibility safety vest holding a stop paddle in an active work zone",
    width: 1536,
    height: 1024,
  },
};
