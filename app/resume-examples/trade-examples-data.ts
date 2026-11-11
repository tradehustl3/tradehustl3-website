type TradeExample = {
  id: string;
  trade: string;
  role: string;
  guideHref: string;
  /** Optional deeper how-to guide for this trade. */
  howToGuide?: { href: string; label: string };
  summary: string;
  bullets: string[];
  skills: string[];
  credentials: string;
};

export const tradeExamples: TradeExample[] = [
  {
    id: "hvac-refrigeration",
    trade: "HVAC & Refrigeration",
    role: "HVAC / Refrigeration Technician",
    guideHref: "/resume-builder/hvac",
    summary:
      "HVAC and refrigeration technician with [X] years of experience servicing [commercial/residential] systems, troubleshooting electrical and refrigerant-side faults, and completing preventive maintenance across [X] assets.",
    bullets: [
      "Diagnosed and completed [X]+ service calls per [week/month] across rooftop units, split systems, and refrigeration equipment, restoring operation on [X]% of first visits.",
      "Completed preventive maintenance on [X] assets per [month/quarter], documenting temperatures, electrical readings, filters, belts, and corrective actions.",
      "Used manifold gauges, multimeters, electronic leak detectors, and recovery equipment to locate faults and complete code-compliant repairs.",
    ],
    skills: ["Refrigeration diagnostics", "Electrical troubleshooting", "RTUs & split systems", "Preventive maintenance"],
    credentials: "EPA Section 608 [type, only if held] · OSHA [10/30, only if held]",
  },
  {
    id: "electrical",
    trade: "Electrical",
    role: "Electrician / Electrical Technician",
    guideHref: "/resume-builder/electrician",
    summary:
      "Electrical technician with [X] years supporting [commercial/industrial/residential] installation, troubleshooting, and maintenance work from plans and job specifications.",
    bullets: [
      "Bent and installed [X] feet of EMT, rigid, or PVC conduit for [project type], maintaining layout accuracy and required support spacing.",
      "Terminated and tested [X] circuits, panels, or control points per [week/project], documenting voltage, continuity, and torque checks.",
      "Troubleshot breakers, motors, contactors, and control circuits with a multimeter and clamp meter to isolate faults before repair.",
    ],
    skills: ["Conduit bending", "Panel terminations", "Motor controls", "Grounding & bonding"],
    credentials: "Electrical license or apprentice registration [state/level, only if held] · OSHA [10/30, only if held]",
  },
  {
    id: "plumbing",
    trade: "Plumbing",
    role: "Plumber / Plumbing Technician",
    guideHref: "/resume-builder/plumbing",
    summary:
      "Plumbing technician experienced in [service/new construction] work, including fixture repair, DWV and water distribution, drain clearing, and customer-facing diagnosis.",
    bullets: [
      "Resolved [X] residential or commercial service calls per [week/month], diagnosing leaks, clogs, failed valves, and water-heater issues.",
      "Installed and tested [X] feet of [copper/PEX/CPVC/PVC] piping for [project type], completing required pressure or leak checks.",
      "Used augers, sewer cameras, press tools, and locating equipment to identify causes and document recommended repairs.",
    ],
    skills: ["DWV rough-in", "Fixture installation", "Drain cleaning", "Water-heater service"],
    credentials: "Plumbing license or apprentice registration [state/level, only if held] · Backflow credential [only if held]",
  },
  {
    id: "construction-carpentry",
    trade: "Construction & Carpentry",
    role: "Carpenter / Construction Technician",
    guideHref: "/resume-builder/construction-carpentry",
    summary:
      "Carpenter and construction technician with hands-on experience in [framing/finish/formwork], plan reading, layout, material takeoffs, and jobsite coordination.",
    bullets: [
      "Framed [X] square feet of walls, floors, or roof assemblies for [project type], working from plans, elevations, and field measurements.",
      "Installed [X] doors, cabinets, trim runs, or hardware sets while tracking punch-list corrections through closeout.",
      "Coordinated daily material staging and tool setup for a crew of [X], helping keep [phase or scope] on schedule.",
    ],
    skills: ["Framing & layout", "Finish carpentry", "Blueprint reading", "Punch-list closeout"],
    credentials: "Carpentry apprenticeship [only if completed] · OSHA [10/30, only if held] · Equipment cards [only if held]",
  },
  {
    id: "facilities-maintenance",
    trade: "Facilities Maintenance",
    role: "Facilities / Maintenance Technician",
    guideHref: "/resume-builder/facilities-maintenance",
    howToGuide: { href: "/resume-examples/maintenance-resume-tips", label: "How to write a maintenance resume" },
    summary:
      "Facilities maintenance technician supporting [X] square feet, [X] units, or [X] buildings through preventive maintenance, work-order response, and multi-trade repairs.",
    bullets: [
      "Closed [X] preventive and corrective work orders per [week/month] in [CMMS name], recording labor, parts, failure details, and follow-up needs.",
      "Maintained [X]% on-time PM completion across HVAC, lighting, plumbing, doors, pumps, motors, and life-safety support tasks.",
      "Responded to priority calls across [X] buildings or units, isolating the problem, making safe repairs, and coordinating vendors when required.",
    ],
    skills: ["CMMS work orders", "Preventive maintenance", "Multi-trade repair", "Vendor coordination"],
    credentials: "EPA 608 [only if held] · OSHA [10/30, only if held] · Lift or forklift card [only if held]",
  },
  {
    id: "welding-fabrication",
    trade: "Welding & Fabrication",
    role: "Welder / Fabricator",
    guideHref: "/resume-builder/welding-fabrication",
    summary:
      "Welder and fabricator experienced with [GMAW/FCAW/GTAW/SMAW], fit-up, blueprint and weld-symbol reading, and inspection-ready work on [materials/products].",
    bullets: [
      "Fit and welded [X] assemblies per [shift/week] using [process] in [positions], working to drawing dimensions and [tolerance, if documented].",
      "Prepared carbon steel, stainless, or aluminum with saws, grinders, plasma cutters, and fixtures before tack-up and final welding.",
      "Completed visual checks and [inspection type, if applicable], documenting repairs and maintaining material or weld traceability where required.",
    ],
    skills: ["Fit-up & tacking", "Weld-symbol reading", "MIG / TIG / stick", "Grinding & plasma cutting"],
    credentials: "AWS or ASME qualification [process/position, only if current] · OSHA [10/30, only if held]",
  },
  {
    id: "general-labor-maintenance",
    trade: "General Labor / Maintenance Technician",
    role: "General Laborer / Maintenance Helper",
    guideHref: "/resume-builder/general-labor",
    summary:
      "Reliable labor and maintenance professional experienced in material handling, work-order support, basic repairs, site cleanup, and safe use of hand and power tools.",
    bullets: [
      "Loaded, staged, or moved [X] pallets, deliveries, or material loads per [shift/week] using [equipment], verifying counts and safe placement.",
      "Completed [X] light-maintenance or PM tasks per [week/month], including filters, lubrication, hardware, patching, painting, and basic fixture repairs.",
      "Supported [X]-person crews with setup, cleanup, barricades, material runs, and documented work-order updates across [site type].",
    ],
    skills: ["Material handling", "Work-order support", "Basic repairs", "Hand & power tools"],
    credentials: "Forklift or lift card [only if held] · OSHA [10/30, only if held] · First Aid/CPR [only if current]",
  },
];

