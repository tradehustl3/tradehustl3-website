/**
 * Shared skilled-trades knowledge base for the guided Resume Builder wizard.
 *
 * The seven `TRADE_TRACKS` values must stay byte-for-byte identical to
 * `ALLOWED_TRADES` in `worker/resume-builder.ts` — the backend rejects anything
 * else. Everything else in this file is UI guidance only (HUSTL3 BOT copy and
 * example chips); it is never sent to the model as fact.
 */

export const TRADE_TRACKS = [
  "HVAC & Refrigeration",
  "Electrical",
  "Plumbing",
  "Construction & Carpentry",
  "Facilities Maintenance",
  "Welding & Fabrication",
  "General Labor / Trade Helper",
] as const;

export type TradeTrack = (typeof TRADE_TRACKS)[number];

export function isTradeTrack(value: string): value is TradeTrack {
  return (TRADE_TRACKS as readonly string[]).includes(value);
}

export const EXPERIENCE_LEVELS = [
  "No paid experience yet",
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "6–10 years",
  "11+ years",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Seasonal",
  "Contract / 1099",
  "Self-employed",
  "Apprentice",
  "Helper",
  "School lab / training",
  "Military",
  "Volunteer",
  "Side work",
] as const;

type TradeGuidance = {
  /** One line under the trade card on Step 1. */
  tagline: string;
  /** HUSTL3 BOT copy for Step 3 — "show us the work". */
  workHistory: string;
  /** HUSTL3 BOT copy for Step 4 — "your field value". */
  fieldValue: string;
  /** Selectable example chips. Users pick or type their own; nothing is auto-claimed. */
  tools: string[];
  equipmentSystems: string[];
  certifications: string[];
  technicalSkills: string[];
};

export const TRADE_GUIDANCE: Record<TradeTrack, TradeGuidance> = {
  "HVAC & Refrigeration": {
    tagline: "Residential, commercial, and rack refrigeration service and installs.",
    workHistory:
      'Instead of "worked on AC units," tell me what you actually touched: RTUs, split systems, heat pumps, '
      + "refrigerant circuits, compressors, contactors, capacitors, motors, thermostats, brazing, PMs, leak checks, "
      + "gauges, multimeters, and CMMS. Add how many units or sites you covered.",
    fieldValue:
      "Lead with EPA 608, then the systems you can stand behind solo. Superheat/subcooling, electrical "
      + "troubleshooting, and start-up checks all count.",
    tools: ["Gauge manifold", "Vacuum pump", "Recovery machine", "Multimeter", "Clamp meter", "Brazing torch", "Leak detector", "Nitrogen regulator", "Fin comb", "Anemometer"],
    equipmentSystems: ["RTUs", "Split systems", "Heat pumps", "Mini-splits", "Walk-in coolers/freezers", "Chillers", "Cooling towers", "VRF/VRV", "Ice machines", "Reach-in refrigeration"],
    certifications: ["EPA 608 Universal", "EPA 608 Type II", "NATE", "OSHA 10", "OSHA 30", "HVAC Excellence", "R-410A safety", "Forklift", "State journeyman/mechanical license"],
    technicalSkills: ["Refrigerant charging", "Superheat / subcooling", "Brazing", "Electrical troubleshooting", "Airflow balancing", "Preventive maintenance", "Startup & commissioning", "Controls / thermostats", "Blueprint reading", "Load calculations"],
  },
  Electrical: {
    tagline: "Residential, commercial, and industrial wiring, service, and controls.",
    workHistory:
      'Skip "did electrical work." Tell me: panels and sub-panels, branch circuits, EMT and rigid bends, '
      + "MC/romex, motor controls, VFDs, lighting retrofits, troubleshooting with a meter, terminations, "
      + "device trim-out, and code you worked to. Add panel counts, footage, or fixture counts.",
    fieldValue:
      "Name the license or apprenticeship hours, then the work you can run: service calls, rough-in, "
      + "trim, troubleshooting, and any controls or low-voltage.",
    tools: ["Multimeter", "Megger", "Wire strippers", "Conduit bender", "Fish tape", "Knockout punch", "Torque screwdriver", "Non-contact tester", "Cable tester", "Hydraulic bender"],
    equipmentSystems: ["Panelboards / load centers", "Switchgear", "Motor control centers", "VFDs", "Transformers", "Generators / ATS", "Lighting controls", "Fire alarm", "PLC I/O", "EV chargers"],
    certifications: ["State journeyman license", "State master license", "Apprenticeship (IBEW/IEC/ABC)", "OSHA 10", "OSHA 30", "NFPA 70E arc flash", "First aid / CPR", "Scissor / boom lift", "OSHA LOTO"],
    technicalSkills: ["Conduit bending", "Wire pulling", "Terminations", "Motor controls", "Troubleshooting", "NEC code compliance", "Blueprint / one-line reading", "Lighting retrofits", "Low-voltage / data", "Load calculations"],
  },
  Plumbing: {
    tagline: "Service, repair, new construction, and backflow across residential and commercial.",
    workHistory:
      'Not "fixed plumbing." Tell me: DWV rough-in, water lines in PEX/copper/CPVC, press and sweat joints, '
      + "fixture set, water heaters and tankless, drain cleaning and jetting, backflow testing, gas lines, "
      + "and slab or main repairs. Add fixture counts, unit counts, or callbacks avoided.",
    fieldValue:
      "Backflow and gas certs first, then the work you own end to end: service calls, rough-in, "
      + "top-out, trim, and drain work.",
    tools: ["Press tool", "Pipe wrench", "Drain snake / auger", "Hydro jetter", "Torch kit", "Inspection camera", "Pipe threader", "PEX crimp/expander", "Manometer", "Basin wrench"],
    equipmentSystems: ["Tank water heaters", "Tankless water heaters", "Sump / sewage pumps", "Backflow preventers", "Grease traps", "Booster pumps", "Water softeners", "Gas piping", "Hydronic heating", "Lift stations"],
    certifications: ["State journeyman license", "State master license", "Backflow tester certification", "Medical gas (NITC)", "Gas fitter license", "OSHA 10", "OSHA 30", "Confined space", "First aid / CPR"],
    technicalSkills: ["DWV rough-in", "Water distribution", "Press / sweat / solvent joints", "Fixture setting", "Drain cleaning", "Water heater install", "Backflow testing", "Gas line install", "Blueprint / isometric reading", "Leak diagnostics"],
  },
  "Construction & Carpentry": {
    tagline: "Framing, finish carpentry, concrete, remodels, and site work.",
    workHistory:
      'Skip "helped build houses." Tell me: wall and roof framing, layout from prints, form and pour concrete, '
      + "hang doors and set trim, cabinets and countertops, drywall, decks, and punch-out. Add square footage, "
      + "units, crew size, or schedule you kept.",
    fieldValue:
      "Lead with OSHA and any equipment cards, then the scopes you can run: framing, finish, concrete, "
      + "and layout.",
    tools: ["Framing nailer", "Circular saw", "Miter saw", "Track saw", "Laser level", "Transit / builder's level", "Rotary hammer", "Table saw", "Concrete vibrator", "Powder-actuated tool"],
    equipmentSystems: ["Wood / steel framing", "Concrete forms", "Roof systems", "Door & window units", "Cabinetry & millwork", "Stair systems", "Drywall systems", "Deck & railing", "Scaffold", "Skid steer / mini-ex"],
    certifications: ["OSHA 10", "OSHA 30", "Carpentry apprenticeship", "Scaffold user / builder", "Forklift / telehandler", "Aerial / scissor lift", "First aid / CPR", "Fall protection", "Silica awareness"],
    technicalSkills: ["Blueprint reading", "Layout", "Framing", "Finish carpentry", "Concrete flatwork", "Formwork", "Drywall hang & finish", "Cabinet install", "Punch-out", "Estimating / takeoff"],
  },
  "Facilities Maintenance": {
    tagline: "Multi-trade upkeep of buildings, grounds, and equipment.",
    workHistory:
      "Think HVAC, plumbing, and electrical troubleshooting, unit turnovers, PMs, work orders, vendor "
      + "coordination, inventory, inspections, emergency calls, building systems, and team leadership. "
      + "Add property counts, unit counts, work-order volume, and PM completion rates.",
    fieldValue:
      "You are multi-trade — say so. List the systems you cover, the CMMS you have used, and any "
      + "certs (EPA 608, CPO, boiler, electrical) that back it up.",
    tools: ["Multimeter", "Drain auger", "Cordless drill/driver", "Torch kit", "Refrigerant gauges", "Pressure washer", "Hand & power tools", "Ladder / lift", "Pool test kit", "Key / lock tools"],
    equipmentSystems: ["Package / split HVAC", "Boilers", "Domestic water & pumps", "Electrical panels & lighting", "Fire / life safety", "Access control", "Elevators (vendor-managed)", "Pool / spa", "Roofing", "Landscape / irrigation"],
    certifications: ["EPA 608", "Certified Pool Operator (CPO)", "OSHA 10", "OSHA 30", "Boiler operator license", "CFC / apartment maintenance (CAMT/EPA)", "Backflow tester", "First aid / CPR", "Forklift / lift"],
    technicalSkills: ["Work-order management", "Preventive maintenance", "HVAC troubleshooting", "Plumbing repair", "Electrical troubleshooting", "Unit turnovers / make-ready", "Vendor management", "Inventory control", "Inspections", "Team leadership"],
  },
  "Welding & Fabrication": {
    tagline: "Structural, pipe, and sheet fabrication and repair.",
    workHistory:
      'Not "welded stuff." Tell me: processes (SMAW, GMAW, FCAW, GTAW), positions (2G, 3G, 6G), materials '
      + "and thicknesses, blueprint and symbol reading, fit-up, jigs and fixtures, cutting (plasma, oxy-fuel, "
      + "track torch), and any code (AWS D1.1, ASME IX). Add footage, joints, or reject rates.",
    fieldValue:
      "List the certs and positions you are tested in, the processes you run daily, and the material "
      + "you know cold.",
    tools: ["MIG welder", "TIG welder", "Stick welder", "Plasma cutter", "Oxy-fuel torch", "Angle grinder", "Bandsaw", "Ironworker", "Press brake", "Fit-up clamps"],
    equipmentSystems: ["Structural steel", "Carbon / stainless / aluminum pipe", "Pressure vessels", "Sheet metal", "Handrail & stair", "Trailers / equipment repair", "Jigs & fixtures", "Overhead crane / rigging", "CNC plasma table", "Weld positioners"],
    certifications: ["AWS D1.1 structural", "ASME Section IX", "API 1104", "6G pipe", "Certified Welding Inspector (CWI)", "OSHA 10", "OSHA 30", "Overhead crane / rigging", "Forklift", "Hot work / fire watch"],
    technicalSkills: ["SMAW", "GMAW / MIG", "FCAW", "GTAW / TIG", "Blueprint & symbol reading", "Fit-up", "Plasma / oxy-fuel cutting", "Grinding & finishing", "Layout", "Weld inspection / NDT support"],
  },
  "General Labor / Trade Helper": {
    tagline: "Site support, material handling, demo, and helping a licensed trade.",
    workHistory:
      'Skip "general labor." Tell me which trade you helped, what you set up and tore down, material '
      + "you moved and staged, demo you did, tools you ran, measurements you took, and jobsite cleanup and "
      + "safety. Add crew size, sites per week, or loads moved.",
    fieldValue:
      "Show reliability and range: equipment you can run, safety training, a license or permit, and the "
      + "trades you have worked under.",
    tools: ["Cordless drill/driver", "Circular saw", "Jackhammer / breaker", "Pressure washer", "Pallet jack", "Hand truck", "Concrete mixer", "Compactor / plate tamp", "Chop saw", "Shop vac"],
    equipmentSystems: ["Scaffold", "Skid steer", "Mini excavator", "Forklift / telehandler", "Scissor / boom lift", "Trench box", "Material hoist", "Generators & compressors", "Dumpsters / debris", "Traffic control"],
    certifications: ["OSHA 10", "OSHA 30", "Forklift", "Aerial / scissor lift", "Flagger / traffic control", "First aid / CPR", "Confined space entry", "CDL (any class)", "Scaffold user"],
    technicalSkills: ["Material handling", "Site setup & cleanup", "Demolition", "Measuring & layout support", "Blueprint reading (basic)", "Equipment operation", "Concrete prep & pour support", "Load / unload", "Jobsite safety", "Tool maintenance"],
  },
};

/** Certification examples common to every trade, shown alongside trade-specific ones. */
export const COMMON_CERTIFICATIONS = [
  "OSHA 10",
  "OSHA 30",
  "NCCER core",
  "First aid / CPR",
  "Forklift operator",
  "Aerial / scissor lift",
  "Confined space",
  "Lockout/tagout (LOTO)",
  "CDL (any class)",
];

/** CMMS / field software examples for Step 4. */
export const SOFTWARE_EXAMPLES = [
  "ServiceTitan",
  "IBM Maximo",
  "Corrigo",
  "Building Engines",
  "Yardi",
  "Salesforce Field Service",
  "UpKeep",
  "Fiix",
  "eMaint",
  "Procore",
  "Bluebeam",
  "Mobile work-order apps",
];

export const SAFETY_TRAINING_EXAMPLES = [
  "Lockout/tagout (LOTO)",
  "Confined space entry",
  "Fall protection",
  "Arc flash / NFPA 70E",
  "Hazard communication",
  "Respirator fit / silica",
  "Ladder & scaffold safety",
  "Hot work / fire watch",
  "Trenching & excavation",
  "Defensive driving",
];

export type WizardStepKey =
  | "trade"
  | "experience"
  | "work-history"
  | "field-value"
  | "target-job"
  | "review"
  | "generate";

export const WIZARD_STEPS: { key: WizardStepKey; label: string; short: string }[] = [
  { key: "trade", label: "Trade", short: "Trade" },
  { key: "experience", label: "Experience", short: "Experience" },
  { key: "work-history", label: "Work History", short: "Work" },
  { key: "field-value", label: "Field Value", short: "Value" },
  { key: "target-job", label: "Target Job", short: "Target" },
  { key: "review", label: "Review", short: "Review" },
  { key: "generate", label: "Generate", short: "Generate" },
];
