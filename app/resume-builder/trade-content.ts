/**
 * Shared skilled-trades knowledge base for the guided Resume Builder wizard.
 *
 * The `TRADE_TRACKS` values must stay byte-for-byte identical to
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
  "Commercial Driving & Transportation",
  "Warehouse, Logistics & Material Handling",
  "Industrial & Warehouse Maintenance",
  "Landscaping & Grounds Maintenance",
  "Roadwork, Paving, Concrete & Heavy Equipment",
  "Roofing & Exterior Trades",
  "Automotive, Diesel & Fleet Maintenance",
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
  dutyCategories: string[];
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
    dutyCategories: ["Diagnostics", "Preventive maintenance", "Refrigerant work", "Electrical troubleshooting", "Compressor service", "Motors / blowers", "24V controls", "Work orders / CMMS", "Customer service", "Safety", "Installation / changeouts", "Leadership"],
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
    dutyCategories: ["Electrical diagnostics", "Service calls", "Rough-in", "Trim-out", "Panels / breakers", "Conduit", "Motor controls", "Low voltage", "Preventive maintenance", "Code compliance", "Safety", "Leadership"],
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
    dutyCategories: ["Leak diagnostics", "Service calls", "DWV rough-in", "Water distribution", "Fixture installation", "Drain cleaning", "Water heaters", "Backflow", "Gas piping", "Blueprints / code", "Safety", "Leadership"],
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
    dutyCategories: ["Layout", "Framing", "Finish carpentry", "Concrete / formwork", "Doors / windows", "Cabinets / millwork", "Drywall", "Punch-out", "Material takeoff", "Equipment operation", "Safety", "Crew leadership"],
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
    dutyCategories: ["HVAC diagnostics", "Preventive maintenance", "Plumbing repair", "Electrical repair", "Mechanical systems", "Unit turnovers", "Work orders / CMMS", "Inspections", "Vendor coordination", "Inventory", "Emergency response", "Team leadership"],
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
    dutyCategories: ["SMAW", "GMAW / MIG", "FCAW", "GTAW / TIG", "Fit-up", "Blueprints / weld symbols", "Structural welding", "Pipe welding", "Cutting / grinding", "Inspection / quality", "Rigging / safety", "Leadership"],
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
    dutyCategories: ["Material handling", "Site setup", "Demolition", "Trade assistance", "Measuring / layout", "Equipment operation", "Concrete support", "Loading / unloading", "Work-order support", "Basic repairs", "Jobsite safety", "Crew support"],
  },
  "Commercial Driving & Transportation": {
    tagline: "Freight, passenger, delivery, public transit, and private transportation.",
    workHistory:
      'Skip "drove a truck" or "transported passengers." Name the vehicle class, route type, endorsements, '
      + "miles, stops or passengers, pre- and post-trip inspections, ELD or dispatch system, loading duties, "
      + "and safety record. Add on-time rate, route volume, or incident-free mileage only when you can verify it.",
    fieldValue:
      "Lead with the license class and current endorsements that the target job requires. Then show the "
      + "equipment, routes, customers or passengers, inspections, and safety responsibilities you handled.",
    tools: ["Electronic logging device (ELD)", "DOT inspection checklist", "Load straps & binders", "Pallet jack", "Liftgate", "Tire-pressure gauge", "Wheel chocks", "Two-way radio", "GPS / route app", "Passenger lift controls"],
    equipmentSystems: ["Tractor-trailer", "Straight / box truck", "Dump truck", "Tanker", "Flatbed", "School bus", "Transit bus", "Motor coach", "Shuttle / paratransit van", "Tow truck"],
    certifications: ["CDL Class A", "CDL Class B", "Passenger endorsement (P)", "School bus endorsement (S)", "Tanker endorsement (N)", "Hazardous materials endorsement (H/X)", "Air brakes qualification", "DOT medical card", "TWIC", "Defensive driving"],
    technicalSkills: ["Pre-trip / post-trip inspection", "ELD & hours-of-service compliance", "Route planning", "Cargo securement", "Passenger assistance", "Defensive driving", "Backing & docking", "Air-brake inspection", "Delivery documentation", "Emergency procedures"],
    dutyCategories: ["Freight transport", "Passenger transport", "Local routes", "OTR / regional routes", "Vehicle inspections", "Cargo securement", "Loading / unloading", "Customer service", "Dispatch communication", "DOT compliance", "Safety performance", "Driver leadership / training"],
  },
  "Warehouse, Logistics & Material Handling": {
    tagline: "Receiving, picking, inventory, docks, fulfillment, and material movement.",
    workHistory:
      'Replace "worked in a warehouse" with the real operation: receiving, put-away, picking, packing, '
      + "shipping, cycle counts, dock loading, replenishment, or returns. Name the equipment and warehouse "
      + "system, then add orders, pallets, units, accuracy, or shift volume you can verify.",
    fieldValue:
      "Show the pace and accuracy of your work without guessing. List active equipment authorizations, "
      + "WMS or scanner experience, inventory responsibility, dock or zone scope, and any lead duties.",
    tools: ["RF scanner", "Handheld barcode scanner", "Pallet jack", "Electric pallet jack", "Reach truck", "Order picker", "Forklift", "Dock plate / leveler", "Stretch-wrap machine", "Shipping scale"],
    equipmentSystems: ["Warehouse management system (WMS)", "Conveyor / sortation", "Pallet racking", "Loading dock", "Cold storage", "Pick modules", "Automated storage / retrieval", "Parcel shipping station", "Inventory cage", "Yard management system"],
    certifications: ["Powered industrial truck authorization", "Forklift operator", "Reach truck authorization", "Order picker authorization", "OSHA 10", "Hazard communication", "First aid / CPR", "Food-safety training", "TWIC", "Rigging / signalperson"],
    technicalSkills: ["Receiving & put-away", "Order picking", "Packing & shipping", "Cycle counting", "Inventory reconciliation", "Loading & unloading", "RF scanning", "Warehouse safety", "Returns processing", "Team / shift leadership"],
    dutyCategories: ["Receiving", "Put-away", "Picking", "Packing", "Shipping", "Inventory control", "Material handling", "Forklift operation", "Dock operations", "Quality / accuracy", "Safety", "Team leadership"],
  },
  "Industrial & Warehouse Maintenance": {
    tagline: "Plant, conveyor, packaging, automation, controls, and reliability work.",
    workHistory:
      'Do not stop at "maintained equipment." Name the conveyors, motors, gearboxes, sensors, PLCs, '
      + "packaging lines, pneumatics, hydraulics, or refrigeration systems you supported. Add PM volume, "
      + "downtime, response time, line speed, or repeat-failure reduction only from your records.",
    fieldValue:
      "Lead with the electrical and mechanical systems you can troubleshoot safely. Show CMMS use, "
      + "lockout/tagout, root-cause work, parts or vendor coordination, and the production areas you covered.",
    tools: ["Multimeter", "Clamp meter", "Megger", "Vibration meter", "Infrared camera", "Laser alignment tool", "Bearing puller", "Grease gun", "PLC programming cable", "Pneumatic test gauge"],
    equipmentSystems: ["Conveyors & sorters", "Motors & gearboxes", "PLCs & HMIs", "Variable-frequency drives", "Pneumatics", "Hydraulics", "Packaging equipment", "Robotics", "Industrial refrigeration", "Automated storage / retrieval"],
    certifications: ["OSHA 10", "OSHA 30", "Lockout/tagout (LOTO)", "NFPA 70E", "EPA 608", "Ammonia refrigeration / RETA", "PLC training", "CMRP", "Forklift", "Aerial / scissor lift"],
    technicalSkills: ["Preventive maintenance", "Electrical troubleshooting", "Mechanical troubleshooting", "PLC / controls diagnostics", "Conveyor repair", "Motor & gearbox replacement", "Precision alignment", "Root-cause analysis", "CMMS documentation", "Parts & inventory control"],
    dutyCategories: ["Preventive maintenance", "Corrective maintenance", "Electrical diagnostics", "Mechanical repair", "Controls / PLCs", "Conveyors", "Packaging equipment", "Pneumatics / hydraulics", "Reliability", "CMMS / work orders", "Safety / LOTO", "Shift leadership"],
  },
  "Landscaping & Grounds Maintenance": {
    tagline: "Landscape, turf, irrigation, tree care, grounds, and seasonal services.",
    workHistory:
      'Skip "did landscaping." Describe the properties, acreage, route, turf and plant care, irrigation '
      + "repairs, pruning, chemical or fertilizer applications, snow work, and equipment you operated. Add "
      + "properties, acres, zones, crew size, or weekly route volume you can verify.",
    fieldValue:
      "Show the environments and seasons you can handle. Put current applicator, irrigation, arborist, "
      + "equipment, and safety credentials up front, then show route ownership and crew responsibility.",
    tools: ["Commercial mower", "String trimmer", "Edger", "Backpack blower", "Chainsaw", "Hedge trimmer", "Core aerator", "Sod cutter", "Irrigation locator", "Skid steer"],
    equipmentSystems: ["Irrigation controllers", "Drip irrigation", "Sprinkler zones", "Turf equipment", "Tree-care rigging", "Snowplow & spreader", "Landscape trailers", "Chemical application systems", "Drainage systems", "Athletic-field equipment"],
    certifications: ["State pesticide applicator license", "ISA Certified Arborist", "Irrigation technician certification", "OSHA 10", "Chainsaw safety", "First aid / CPR", "Commercial driver's license", "Forklift / skid steer", "Snow & ice management training", "Landscape industry certification"],
    technicalSkills: ["Landscape maintenance", "Turf care", "Irrigation diagnostics", "Tree & shrub pruning", "Chemical application", "Equipment operation", "Plant identification", "Drainage repair", "Snow & ice response", "Crew leadership"],
    dutyCategories: ["Mowing / turf", "Pruning", "Irrigation", "Plant installation", "Chemical application", "Tree care", "Grounds cleanup", "Equipment maintenance", "Snow removal", "Route management", "Safety", "Crew leadership"],
  },
  "Roadwork, Paving, Concrete & Heavy Equipment": {
    tagline: "Asphalt, concrete, grading, utilities, traffic control, and earthmoving.",
    workHistory:
      'Replace "ran equipment" with the machine, attachment, material, grade, and work zone. Describe '
      + "paving, rolling, excavation, trenching, grading, concrete placement, traffic control, inspections, "
      + "and daily maintenance. Add tons, yards, lane miles, footage, or production only when verified.",
    fieldValue:
      "Lead with operator cards, CDL, flagger, or OSHA training, then name the equipment you can run "
      + "independently, the ground or road scopes you know, and your safety and inspection habits.",
    tools: ["Laser level", "Grade rod", "Plate compactor", "Concrete vibrator", "Cut-off saw", "Asphalt lute", "Screed controls", "Hand tamper", "Pipe laser", "Two-way radio"],
    equipmentSystems: ["Asphalt paver", "Road roller", "Excavator", "Wheel loader", "Bulldozer", "Motor grader", "Skid steer", "Backhoe", "Concrete pump", "Milling machine"],
    certifications: ["OSHA 10", "OSHA 30", "Flagger / traffic control", "CDL Class A", "CDL Class B", "NCCER equipment operator", "Trenching & excavation competent person", "First aid / CPR", "Silica awareness", "Crane signalperson"],
    technicalSkills: ["Equipment operation", "Fine grading", "Asphalt placement", "Compaction", "Concrete placement & finishing", "Trenching & excavation", "Underground utility support", "Traffic control", "Daily equipment inspection", "Plan / grade reading"],
    dutyCategories: ["Paving", "Rolling / compaction", "Grading", "Excavation", "Concrete", "Utilities", "Traffic control", "Equipment inspection", "Material placement", "Grade checking", "Safety", "Crew leadership"],
  },
  "Roofing & Exterior Trades": {
    tagline: "Residential and commercial roofing, waterproofing, siding, and exteriors.",
    workHistory:
      'Do not write only "installed roofs." Name the system—shingle, TPO, EPDM, PVC, modified bitumen, '
      + "metal, coating, siding, gutter, or waterproofing—plus tear-off, deck repair, flashing, detail work, "
      + "testing, and equipment. Add squares, linear feet, projects, or crew size you can prove.",
    fieldValue:
      "Show the roof and exterior systems you know, manufacturer training, fall-protection discipline, "
      + "service or leak-detection ability, and whether you can lead layout, detail, or closeout work.",
    tools: ["Roofing nailer", "Seam welder", "Hot-air welder", "Core cutter", "Moisture scanner", "Sheet-metal brake", "Snips & seamers", "Chalk line", "Fall-arrest system", "Material hoist"],
    equipmentSystems: ["Asphalt shingles", "TPO roofing", "EPDM roofing", "PVC roofing", "Modified bitumen", "Standing-seam metal", "Roof coatings", "Siding systems", "Gutters & downspouts", "Below-grade waterproofing"],
    certifications: ["OSHA 10", "OSHA 30", "Fall protection", "Manufacturer system certification", "NRCA training", "Aerial / scissor lift", "First aid / CPR", "Forklift / telehandler", "Hot-work training", "State roofing license"],
    technicalSkills: ["Tear-off & deck prep", "Membrane installation", "Shingle installation", "Metal roofing", "Flashing & details", "Leak diagnostics", "Heat welding", "Sheet-metal fabrication", "Waterproofing", "Roof inspection"],
    dutyCategories: ["Tear-off", "Deck repair", "Shingle roofing", "Single-ply roofing", "Metal roofing", "Flashing", "Service / leaks", "Waterproofing", "Siding / gutters", "Equipment operation", "Fall protection", "Crew leadership"],
  },
  "Automotive, Diesel & Fleet Maintenance": {
    tagline: "Cars, trucks, buses, trailers, fleets, heavy equipment, and mobile repair.",
    workHistory:
      'Skip "fixed vehicles." Name the vehicle or equipment classes, diagnostic platforms, engines, '
      + "electrical, brakes, steering, suspension, HVAC, aftertreatment, hydraulics, and PM work you handled. "
      + "Add repair orders, fleet size, turnaround, comeback reduction, or uptime only from real records.",
    fieldValue:
      "Lead with ASE, manufacturer, CDL, inspection, or emissions credentials. Then show the systems you "
      + "diagnose independently, scan-tool experience, documentation, and the fleet or shop scope you owned.",
    tools: ["Diagnostic scan tool", "Digital multimeter", "Oscilloscope", "Battery / charging tester", "Torque wrench", "Brake lathe", "A/C recovery machine", "Diesel compression tester", "Hydraulic pressure kit", "Vehicle lift"],
    equipmentSystems: ["Gasoline engines", "Diesel engines", "Transmissions", "Air brakes", "Hydraulic brakes", "Steering & suspension", "Vehicle electrical", "HVAC", "Diesel aftertreatment", "Hydraulic equipment"],
    certifications: ["ASE certification", "ASE Master Technician", "EPA 609", "CDL Class A", "CDL Class B", "DOT inspector qualification", "Brake inspector qualification", "Manufacturer training", "Forklift", "State inspection / emissions license"],
    technicalSkills: ["Computer diagnostics", "Electrical diagnostics", "Preventive maintenance", "Engine repair", "Brake systems", "Steering & suspension", "HVAC service", "Aftertreatment diagnostics", "Hydraulic repair", "Repair-order documentation"],
    dutyCategories: ["Diagnostics", "Preventive maintenance", "Engine", "Electrical", "Brakes", "Steering / suspension", "HVAC", "Aftertreatment", "Hydraulics", "Inspections", "Shop safety", "Team leadership"],
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
