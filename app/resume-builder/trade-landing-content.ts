/**
 * Content model for the trade-specific Resume Builder SEO landing pages.
 *
 * Every trade page (`/resume-builder/hvac`, `/resume-builder/facilities-maintenance`,
 * `/resume-builder/electrician`, …) renders the same server-rendered
 * <TradeLandingPage /> shell — built from the shared `.rb-*` Resume Builder
 * design system — filled by one `TradeLandingContent` object. The shell
 * guarantees consistent structure, typography, schema, and analytics wiring;
 * the content object carries genuinely trade-specific copy. Every heading,
 * bullet, and FAQ is written for its trade — never a template with the trade
 * name swapped in. Nothing here claims a certification, license, or
 * accomplishment on the customer's behalf.
 */

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "../site";
import type { TradeTrack } from "./trade-content";
import { slugForTradeTrack } from "./trade-preselect";

export type LabeledGroup = { label: string; items: string[] };
export type FaqItem = { question: string; answer: string };
export type StatItem = { value: string; label: string };
export type SectionHead = { kicker: string; heading: string };
export type CtaLocations = { header: string; hero: string; pricing: string; closing: string };

export type TradeLandingContent = {
  /** Route slug, e.g. "hvac" for /resume-builder/hvac. A canonical trade slug. */
  slug: string;
  /** The intake trade this page preselects. */
  trade: TradeTrack;
  /** Exact <title>. Rendered verbatim (no site template appended). */
  seoTitle: string;
  /** Exact meta description. */
  seoDescription: string;
  /** Absolute-path OG/Twitter image. */
  ogImage: string;
  /** Search intents this page targets — for docs/review only, not shown on the page. */
  targetQueries: string[];
  /** Full label for footer / hub anchor text (e.g. "HVAC Resume Builder"). */
  shortName: string;
  /** Short nav label for the breadcrumb's third crumb (e.g. "HVAC"). */
  breadcrumbName: string;
  /** GA/Meta `data-item` value for this page's CTAs. */
  analyticsItem: string;
  /** GA/Meta `data-location` value per CTA slot. */
  ctaLocations: CtaLocations;

  hero: {
    kicker: string;
    heading: string;
    headingAccent: string;
    lead: string;
    ctaLabel: string;
    proofStats: [StatItem, StatItem, StatItem];
  };
  pricing: {
    kicker: string;
    heading: string;
    subhead: string;
    bullets: string[];
    ctaLabel: string;
  };
  valueProps: SectionHead & { items: LabeledGroup[] };
  whoItIsFor: SectionHead & { items: string[] };
  skills: SectionHead & { intro: string; groups: LabeledGroup[] };
  certifications: SectionHead & { intro: string; items: string[]; note: string };
  tools: SectionHead & { intro: string; groups: LabeledGroup[] };
  accomplishments: SectionHead & { intro: string; examples: string[]; disclaimer: string };
  howItWorks: { title: string; body: string }[];
  ats: { heading: string; body: string[] };
  faq: SectionHead & { items: FaqItem[] };
  closingCta: { kicker: string; heading: string; body: string; ctaLabel: string };
};

export function tradeLandingPath(content: Pick<TradeLandingContent, "slug">): string {
  return `/resume-builder/${content.slug}`;
}

/** Page metadata for a trade landing page. Fully specifies OG/Twitter so nothing
 *  is inherited from the site root's `url: "/"`. Canonical is a production path. */
export function buildTradeLandingMetadata(content: TradeLandingContent): Metadata {
  const path = tradeLandingPath(content);
  return {
    title: { absolute: content.seoTitle },
    description: content.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: content.seoTitle,
      description: content.seoDescription,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [{ url: content.ogImage, width: 1200, height: 630, alt: content.seoTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.seoTitle,
      description: content.seoDescription,
      images: [content.ogImage],
    },
  };
}

/** WebPage + BreadcrumbList + FAQPage graph, matching the site's existing JSON-LD style.
 *  The FAQ entities are the same `content.faq.items` the page renders. */
export function buildTradeLandingJsonLd(content: TradeLandingContent) {
  const url = `${SITE_URL}${tradeLandingPath(content)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: content.seoTitle,
        description: content.seoDescription,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
        primaryImageOfPage: `${SITE_URL}${content.ogImage}`,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Resume Builder", item: `${SITE_URL}/resume-builder` },
          { "@type": "ListItem", position: 3, name: content.breadcrumbName, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: content.faq.items.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

// The 4 "how it works" steps are the same funnel for every trade; only the
// trade label, the preselected intake track, and the BOT's focus differ.
const HOW_IT_WORKS = (tradeLabel: string, intakeTrade: string, botFocus: string) => [
  {
    title: "Create a verified account",
    body: "No password — confirm a secure magic link by email. Your intake saves to your account, not just this browser.",
  },
  {
    title: `Answer the guided ${tradeLabel} intake`,
    body:
      `The trade is preselected to ${intakeTrade}. Add your certifications and licenses, the ${botFocus} you know, `
      + "each role, and the job you're targeting. HUSTL3 BOT prompts you for the specifics at every step.",
  },
  {
    title: `Preview your ${tradeLabel} resume free`,
    body: "Review a watermarked, ATS-friendly draft before paying. Check every fact and number.",
  },
  {
    title: "Unlock for $9.99 one-time",
    body:
      "Remove the watermark and download a clean PDF plus an editable DOCX. Up to 3 corrections within 7 days. "
      + "No subscription, no auto-renewal.",
  },
];

// ===========================================================================
// HVAC & Refrigeration
// ===========================================================================

export const HVAC_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("HVAC & Refrigeration"),
  trade: "HVAC & Refrigeration",
  shortName: "HVAC Resume Builder",
  breadcrumbName: "HVAC",
  analyticsItem: "resume_builder_hvac",
  ctaLocations: {
    header: "hvac_header",
    hero: "hvac_hero",
    pricing: "hvac_pricing_card",
    closing: "hvac_footer_cta",
  },
  seoTitle: "HVAC Resume Builder | HVAC Technician Resume | TRADE HUSTL3",
  seoDescription:
    "TRADE HUSTL3's HVAC Resume Builder turns your EPA 608, tools, and field experience into an ATS-ready HVAC technician resume. $9.99 one-time, no subscription.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "hvac resume builder",
    "hvac technician resume builder",
    "hvac technician resume",
    "hvac resume",
    "hvac resume skills",
    "hvac resume examples",
    "epa 608 resume",
    "hvac service technician resume",
  ],

  hero: {
    kicker: "/ HVAC & REFRIGERATION RESUME BUILDER",
    heading: "AN HVAC RESUME BUILT",
    headingAccent: "FROM THE ROOFTOP DOWN.",
    lead:
      "You diagnose refrigerant faults, troubleshoot contactors and capacitors, run PM routes, and braze line sets. Most resume tools flatten all of that into “performed HVAC maintenance.” TRADE HUSTL3 turns your EPA 608, the systems you’ve serviced, and your real field results into an ATS-ready HVAC technician resume.",
    ctaLabel: "Build my HVAC resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "EPA 608", label: "Certifications up top" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your HVAC resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed HVAC resume · watermarked preview before payment",
      "EPA 608 and certifications placed where ATS looks first",
      "ATS-friendly structure across the HVAC & Refrigeration track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my HVAC resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "AN HVAC RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Speaks HVAC",
        items: [
          "Refrigerant, airside, electrical, and preventive-maintenance language that hiring managers and applicant tracking systems expect — not generic office phrasing.",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "Your EPA 608 type, the RTUs and split systems you’ve run solo, the callbacks you’ve cut. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "ATS-aware structure",
        items: [
          "Standard headings and clean formatting, with room to mirror the exact keywords in the HVAC posting you’re targeting.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR HVAC FIELD WORKERS AT EVERY STAGE",
    items: [
      "HVAC service technicians and maintenance techs moving to a better shop",
      "Installers and helpers stepping up to a lead or service-tech role",
      "Apprentices and trade-school grads applying for a first HVAC job",
      "Commercial refrigeration and rooftop-unit (RTU) technicians",
      "Facilities and building engineers whose day is mostly HVAC",
      "Techs relocating to a new state or market, or returning to the trade",
      "Military, maintenance, or electrical backgrounds moving into HVAC",
    ],
  },

  skills: {
    kicker: "/ HVAC RESUME SKILLS",
    heading: "THE HVAC SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick the skills you can stand behind on a service call — the builder never claims one you didn’t enter. These are the HVAC skills employers scan for, grouped the way a resume reads.",
    groups: [
      {
        label: "Refrigeration & airside",
        items: [
          "Refrigerant charging (R-410A, R-454B, R-22)",
          "Recovery, evacuation & deep vacuum (micron gauge)",
          "Superheat / subcooling",
          "Electronic leak detection",
          "Brazing & silver soldering",
          "TXV and metering-device diagnostics",
          "Airflow, static pressure & CFM balancing",
          "Coil, blower & filter preventive maintenance",
        ],
      },
      {
        label: "Electrical & controls",
        items: [
          "Multimeter & clamp-meter diagnostics",
          "Contactors, capacitors & relays",
          "Condenser fan & blower motors, ECMs",
          "Transformers & 24V low-voltage circuits",
          "Thermostats, zoning & defrost boards",
          "Sequence of operation & wiring-diagram reading",
          "Building controls / BAS / DDC basics",
        ],
      },
      {
        label: "Systems serviced",
        items: [
          "Rooftop units (RTUs) / packaged units",
          "Split systems & heat pumps",
          "Ductless mini-splits & VRF/VRV",
          "Gas & electric furnaces",
          "Walk-in coolers & freezers, reach-ins",
          "Ice machines",
          "Chillers & cooling towers",
          "Make-up air & exhaust units",
        ],
      },
      {
        label: "Service & site",
        items: [
          "Preventive maintenance & PM route management",
          "Service calls, diagnostics & startup/commissioning",
          "Customer communication & write-ups",
          "Work orders & CMMS/FSM (ServiceTitan, FieldEdge, Maximo)",
          "EPA-compliant refrigerant logging",
          "On-call rotation & emergency service",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ HVAC CERTIFICATIONS",
    heading: "EPA 608 FIRST, THEN THE REST",
    intro:
      "HVAC postings screen hard on certifications. List what you hold near the top of the resume, with the type and year — the builder puts them where recruiters and ATS look first.",
    items: [
      "EPA Section 608 (Type I, II, III, or Universal)",
      "EPA Section 609 (motor vehicle A/C)",
      "NATE (Core plus specialty)",
      "HVAC Excellence",
      "R-410A / A2L refrigerant safety",
      "OSHA 10 / OSHA 30",
      "NCCER HVAC",
      "State mechanical / journeyman HVAC license",
      "Forklift / aerial & scissor lift",
      "First aid / CPR",
    ],
    note:
      "Still testing for EPA 608? You can list it as “in progress.” TRADE HUSTL3 only includes a certification you enter yourself.",
  },

  tools: {
    kicker: "/ HVAC TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS THAT SHOW WHAT YOU RUN SOLO",
    intro:
      "The tools and instruments you name tell an employer what you can actually do unsupervised. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Refrigerant & brazing",
        items: [
          "Digital gauge manifold",
          "Vacuum pump & micron gauge",
          "Refrigerant recovery machine & scale",
          "Nitrogen regulator",
          "Oxy-acetylene / turbo brazing torch",
          "Core removal tools",
          "Tubing cutters, flaring & swaging tools",
        ],
      },
      {
        label: "Electrical & airflow",
        items: [
          "Digital multimeter & clamp meter",
          "Electronic leak detector",
          "Combustion analyzer",
          "Anemometer & manometer",
          "Infrared thermometer / psychrometer",
          "Capacitor tester",
        ],
      },
      {
        label: "Mechanical & PM",
        items: [
          "Coil cleaning pump & fin comb",
          "Nut drivers, hex keys & service wrenches",
          "Cordless drill / impact",
          "Reciprocating saw & sheet-metal tools",
          "Ladders, lifts & fall-protection gear",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ HVAC RESUME EXAMPLES",
    heading: "EXAMPLE HVAC ACCOMPLISHMENT BULLETS",
    intro:
      "Field work becomes stronger resume bullets when it has equipment, scope, and a number attached. Examples of the shape a good HVAC bullet takes:",
    examples: [
      "Completed 8–12 residential service calls per day, diagnosing refrigerant, airflow, and electrical faults on split systems and heat pumps.",
      "Maintained 40+ rooftop units across 6 retail sites on a quarterly PM schedule, holding unplanned service calls below 5% of the fleet.",
      "Recovered and recharged R-410A and R-22 systems per EPA 608 procedure, logging refrigerant use for compliance.",
      "Cut first-visit callback rate from 14% to 6% over two quarters by verifying superheat/subcooling and static pressure on every startup.",
      "Brazed line sets and replaced compressors, TXVs, and condenser fan motors on 2–20 ton commercial equipment.",
      "Trained two apprentices on multimeter diagnostics, contactor and capacitor testing, and safe recovery practices.",
      "Entry level: completed 240 hours of HVAC lab training in brazing, evacuation, and electrical troubleshooting; earned EPA Section 608 Universal and OSHA 10.",
    ],
    disclaimer:
      "These are examples of how field work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience or numbers.",
  },

  howItWorks: [
    {
      title: "Create a verified account",
      body: "No password — confirm a secure magic link by email. Your intake saves to your account, not just this browser.",
    },
    {
      title: "Answer the guided HVAC intake",
      body: "The trade is preselected to HVAC & Refrigeration. Add your EPA 608 and other certs, the tools and systems you know, each role, and the job you’re targeting. HUSTL3 BOT prompts you for HVAC specifics at every step.",
    },
    {
      title: "Preview your HVAC resume free",
      body: "Review a watermarked, ATS-friendly draft before paying. Check every fact and number.",
    },
    {
      title: "Unlock for $9.99 one-time",
      body: "Remove the watermark and download a clean PDF plus an editable DOCX. Up to 3 corrections within 7 days. No subscription, no auto-renewal.",
    },
  ],

  ats: {
    heading: "BUILT TO CLEAR HVAC ATS SCREENS",
    body: [
      "Most HVAC applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: EPA 608, preventive maintenance, RTU, split system, heat pump, refrigerant, electrical troubleshooting, diagnostics.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned HVAC resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ HVAC RESUME FAQ",
    heading: "HVAC RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should an HVAC resume include?",
        answer:
          "Contact details and a target job title, a short summary, your EPA 608 (with type and year) and any other certifications, an HVAC skills section, work history that names the equipment and systems you serviced (RTUs, split systems, heat pumps, walk-in coolers, chillers), and measurable results such as units maintained, sites covered, or callback rate. The TRADE HUSTL3 HVAC Resume Builder walks you through each of these one question at a time.",
      },
      {
        question: "What HVAC skills should I put on a resume?",
        answer:
          "List only skills you can back up on a service call. Common ones: refrigerant charging, recovery and evacuation, superheat/subcooling, electrical troubleshooting (contactors, capacitors, motors, transformers), brazing, leak detection, preventive maintenance, startup and commissioning, thermostat and controls wiring, and airflow balancing. Name the systems too — RTUs, mini-splits, heat pumps, furnaces, refrigeration — and the CMMS or field-service software you have used.",
      },
      {
        question: "Do I need EPA 608 certification on my HVAC resume?",
        answer:
          "If you have it, put it near the top. Most HVAC job postings require EPA Section 608 (Type I, II, III, or Universal) to handle refrigerant, so recruiters and ATS filters look for it first. Include the type and the year you earned it. If you are still testing, you can list it as “in progress.” The builder never adds a certification you did not enter.",
      },
      {
        question: "How do I write an HVAC resume with no experience?",
        answer:
          "Lean on trade school and lab hours, an apprenticeship, EPA 608 or OSHA 10, the tools you own, ride-alongs, and any related work such as maintenance, general labor, or customer service. The intake has an entry-level path that builds the resume around training, certifications, and skills instead of years on the job.",
      },
      {
        question: "What is the difference between an HVAC technician resume and an HVAC installer resume?",
        answer:
          "A service/technician resume emphasizes diagnostics, troubleshooting, refrigerant work, and callback rate. An installer resume emphasizes line sets, equipment set, brazing, startup, and units installed per week. Paste your target posting into the intake and the builder prioritizes the language that matches that role.",
      },
      {
        question: "Can I use it for commercial refrigeration or building-controls roles?",
        answer:
          "Yes. The HVAC & Refrigeration track covers rack refrigeration, walk-ins, ice machines, chillers, and building controls (BAS/DDC) alongside residential and light-commercial HVAC. Add the systems and control platforms you have worked on in your own words.",
      },
      {
        question: "Are there HVAC resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong HVAC resume line — equipment, scope, and a number. Rather than copying a sample, you answer a guided intake and the builder turns your own field work into that format, then shows you a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR HVAC RESUME, BUILT RIGHT.",
    body: "Guided HVAC intake. EPA 608 and certifications up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my HVAC resume",
  },
};

// ===========================================================================
// Facilities Maintenance
// ===========================================================================

export const FACILITIES_MAINTENANCE_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("Facilities Maintenance"),
  trade: "Facilities Maintenance",
  shortName: "Facilities Maintenance Resume Builder",
  breadcrumbName: "Facilities Maintenance",
  analyticsItem: "resume_builder_facilities_maintenance",
  ctaLocations: {
    header: "facilities_header",
    hero: "facilities_hero",
    pricing: "facilities_pricing",
    closing: "facilities_closing",
  },
  seoTitle: "Facilities Maintenance Resume Builder | TRADE HUSTL3",
  seoDescription:
    "Turn your PMs, work orders, CMMS history, and multi-trade repairs into an ATS-ready maintenance technician resume. $9.99 one-time, no subscription — TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "facilities maintenance resume builder",
    "facilities maintenance resume",
    "facilities maintenance technician resume",
    "maintenance technician resume builder",
    "building maintenance resume",
    "facility maintenance resume",
    "maintenance technician resume",
    "facilities technician resume",
  ],

  hero: {
    kicker: "/ FACILITIES MAINTENANCE RESUME BUILDER",
    heading: "A FACILITIES RESUME BUILT",
    headingAccent: "FOR THE WHOLE BUILDING.",
    lead:
      "You close work orders across HVAC, plumbing, electrical, and mechanical, run PM routes, handle turnovers, and keep the CMMS current. A generic resume buries all of that under “general maintenance.” TRADE HUSTL3 turns the systems you service, the tools you run, and the work you’ve completed into an ATS-ready facilities maintenance resume.",
    ctaLabel: "Build my maintenance resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "Multi-trade", label: "HVAC · electrical · plumbing" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your maintenance resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed maintenance resume · watermarked preview before payment",
      "Certifications, licenses, and CMMS experience placed where ATS looks first",
      "ATS-friendly structure across the Facilities Maintenance track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my maintenance resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "A MAINTENANCE RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Multi-trade language",
        items: [
          "Preventive and corrective maintenance, work orders, CMMS, building systems, and turnovers — the wording facilities managers and applicant tracking systems look for, not “handyman.”",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "The systems you actually service, the CMMS you’ve used, the certifications you hold. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "ATS-aware structure",
        items: [
          "Standard headings and clean formatting, with room to mirror the exact keywords in the maintenance posting you’re targeting.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR EVERY FACILITIES MAINTENANCE ROLE",
    items: [
      "Facilities and building maintenance technicians moving up",
      "Apartment and multifamily maintenance techs and make-ready leads",
      "Maintenance techs at schools, hospitals, warehouses, retail, or office campuses",
      "Handypersons and general maintenance workers formalizing a resume",
      "Building engineers and maintenance supervisors",
      "HVAC, electrical, or plumbing helpers moving into multi-trade facilities work",
      "Maintenance techs relocating or returning to the trade",
    ],
  },

  skills: {
    kicker: "/ FACILITIES MAINTENANCE SKILLS",
    heading: "THE MAINTENANCE SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you can back up on a work order — the builder never claims a skill you didn’t enter. Grouped the way a facilities maintenance resume reads.",
    groups: [
      {
        label: "Preventive & corrective maintenance",
        items: [
          "Preventive maintenance (PM) routes and schedules",
          "Corrective / demand maintenance",
          "Work-order intake, prioritization & close-out",
          "Root-cause troubleshooting",
          "Life-safety, roof & mechanical-room inspections and rounds",
          "Make-ready / unit turnovers",
          "Emergency and on-call response",
        ],
      },
      {
        label: "Building systems",
        items: [
          "Package & split HVAC, RTUs, filters & belts",
          "Domestic water, fixtures, faucets & flush valves",
          "Drain clearing & minor pipe repair",
          "Lighting, ballasts, LED retrofits & switches",
          "Breakers, receptacles & basic electrical troubleshooting",
          "Pumps, motors, bearings, belts & couplings",
          "Doors, closers, locks & hardware",
        ],
      },
      {
        label: "Tools & instruments",
        items: [
          "Digital multimeter & voltage tester",
          "Hand & power tools",
          "Drain auger / hand snake",
          "Pipe wrenches, press & sweat tools",
          "Ladders, lifts & fall protection",
          "Paint, drywall & patch tools",
          "Pressure washer & wet/dry vac",
        ],
      },
      {
        label: "Documentation & coordination",
        items: [
          "CMMS / work-order software (UpKeep, Fiix, eMaint, Maximo, Corrigo)",
          "Yardi, Building Engines & mobile work-order apps",
          "Vendor and contractor coordination",
          "Parts inventory & purchase-order requests",
          "Blueprint, schematic & O&M manual reading",
          "Tenant / resident communication",
          "Lockout/tagout, safety compliance & PM records",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ CERTIFICATIONS & LICENSES",
    heading: "LIST WHAT YOU ACTUALLY HOLD",
    intro:
      "Facilities postings screen on certifications and licenses. List the ones you hold near the top, with the year — the builder never adds one you didn’t enter.",
    items: [
      "EPA Section 608 (Type I / II / III / Universal)",
      "Certified Pool/Spa Operator (CPO)",
      "OSHA 10 / OSHA 30",
      "Certified Apartment Maintenance Technician (CAMT)",
      "EPA Lead RRP (Renovation, Repair & Painting)",
      "Boiler operator / stationary engineer license (where required)",
      "Backflow prevention tester certification",
      "HVAC, electrical, or plumbing journeyman license (if held)",
      "Forklift / aerial & scissor lift",
      "First aid / CPR / AED",
    ],
    note:
      "No license? Many facilities roles don’t require one. List the certifications and hands-on systems you can back up, and the builder builds around those.",
  },

  tools: {
    kicker: "/ TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS THAT SHOW YOUR RANGE",
    intro:
      "The tools and instruments you name tell a facilities manager what you can handle without a callback. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Diagnostics & electrical",
        items: [
          "Digital multimeter & clamp meter",
          "Non-contact voltage tester",
          "Outlet / GFCI tester",
          "Infrared thermometer",
          "Receptacle analyzer",
        ],
      },
      {
        label: "Plumbing & mechanical",
        items: [
          "Drain auger / closet auger",
          "Pipe wrenches & channel locks",
          "PEX crimp, press & propane torch kit",
          "Faucet & cartridge puller",
          "Grease gun & bearing tools",
        ],
      },
      {
        label: "General & grounds",
        items: [
          "Cordless drill / impact & SDS rotary hammer",
          "Reciprocating & circular saw",
          "Drywall & paint tools",
          "Pressure washer & wet/dry vac",
          "Ladders, scaffold & scissor lift",
          "String trimmer / snow blower (seasonal)",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ MAINTENANCE RESUME EXAMPLES",
    heading: "EXAMPLE MAINTENANCE ACCOMPLISHMENT BULLETS",
    intro:
      "Maintenance work becomes stronger resume bullets when it names the systems, the volume, and a result. Examples of the shape a good facilities bullet takes:",
    examples: [
      "Closed 25–35 work orders per week across HVAC, plumbing, electrical, and general repairs on a 400-unit apartment community.",
      "Completed quarterly PM routes on 60+ RTUs, exhaust fans, and pumps, holding PM completion above 95% in the CMMS.",
      "Turned over 12–18 units per month, coordinating paint, flooring, appliance, and punch work to a 5-day make-ready standard.",
      "Cut after-hours emergency calls about 20% over two quarters by adding belt, filter, and drain-line PMs to the schedule.",
      "Troubleshot and repaired lighting circuits, GFCIs, breakers, and 120/240V receptacles; replaced ballasts with LED retrofits building-wide.",
      "Managed parts inventory and purchase-order requests in Fiix, reducing stock-outs on common HVAC and plumbing parts.",
      "Entry level: completed a facilities maintenance certificate with HVAC, electrical, and plumbing lab hours; earned EPA 608 and OSHA 10.",
    ],
    disclaimer:
      "These are examples of how facilities work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience or numbers.",
  },

  howItWorks: HOW_IT_WORKS("maintenance", "Facilities Maintenance", "CMMS and building systems"),

  ats: {
    heading: "BUILT TO CLEAR FACILITIES ATS SCREENS",
    body: [
      "Most facilities maintenance applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: preventive maintenance, work orders, CMMS, HVAC, electrical troubleshooting, plumbing repairs, building systems, turnovers.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned maintenance resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ FACILITIES MAINTENANCE FAQ",
    heading: "MAINTENANCE RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should a facilities maintenance resume include?",
        answer:
          "Contact details and a target title, a short summary, your certifications and any licenses (with years), a skills section grouped by system, work history that names the buildings and systems you maintained and the CMMS you used, and measurable results such as work orders closed per week, PM completion rate, or units turned. The TRADE HUSTL3 builder walks you through each one question at a time.",
      },
      {
        question: "What skills should I put on a maintenance technician resume?",
        answer:
          "List only skills you can back up on a work order: preventive and corrective maintenance, HVAC filter and belt service, basic electrical troubleshooting (breakers, receptacles, lighting), plumbing repairs (fixtures, drains, water heaters), pumps and motors, doors and hardware, drywall and paint, and CMMS or work-order software. Group them by system so a facilities manager can scan them fast.",
      },
      {
        question: "Do I need certifications or a license for a facilities maintenance job?",
        answer:
          "Many facilities roles don’t require a trade license. Certifications that help include EPA Section 608 (for refrigerant work), CPO (pools), OSHA 10 or 30, CAMT for apartments, and EPA Lead RRP. List what you hold with the year. The builder never adds a certification or license you didn’t enter.",
      },
      {
        question: "How do I write a maintenance resume with no experience?",
        answer:
          "Lean on a facilities or trades certificate, lab hours, an apprenticeship, EPA 608 or OSHA 10, the tools you own, and any related work — janitorial, groundskeeping, warehouse, construction labor, or customer service. The intake has an entry-level path that builds the resume around training and skills instead of years on the job.",
      },
      {
        question: "What is the difference between a building maintenance and a facilities maintenance resume?",
        answer:
          "They overlap heavily. “Building maintenance” often emphasizes a single property and hands-on repairs; “facilities maintenance” often adds multi-site coverage, CMMS, PM programs, vendor coordination, and compliance rounds. Paste your target posting and the builder prioritizes the wording that matches that role.",
      },
      {
        question: "Should CMMS software go on my resume?",
        answer:
          "Yes. Name the platforms you’ve used — UpKeep, Fiix, eMaint, Maximo, Corrigo, Building Engines, Yardi — and what you did in them (work-order close-out, PM scheduling, parts and purchase-order requests). It’s one of the first things a facilities manager looks for.",
      },
      {
        question: "Are there maintenance resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong facilities line — system, volume, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR MAINTENANCE RESUME, BUILT RIGHT.",
    body: "Guided facilities intake. Certifications and CMMS up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my maintenance resume",
  },
};

// ===========================================================================
// Electrician (Electrical track)
// ===========================================================================

export const ELECTRICIAN_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("Electrical"),
  trade: "Electrical",
  shortName: "Electrician Resume Builder",
  breadcrumbName: "Electrician",
  analyticsItem: "resume_builder_electrician",
  ctaLocations: {
    header: "electrician_header",
    hero: "electrician_hero",
    pricing: "electrician_pricing",
    closing: "electrician_closing",
  },
  seoTitle: "Electrician Resume Builder | Electrical Technician Resume | TRADE HUSTL3",
  seoDescription:
    "Turn your troubleshooting, wiring, conduit, and panel work into an ATS-ready electrician resume — apprentice to journeyman. $9.99 one-time, no subscription. TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "electrician resume builder",
    "electrician resume",
    "electrician resume examples",
    "electrician resume skills",
    "electrical technician resume",
    "electrical maintenance technician resume",
    "apprentice electrician resume",
    "journeyman electrician resume",
  ],

  hero: {
    kicker: "/ ELECTRICIAN RESUME BUILDER",
    heading: "ELECTRICIAN RESUME,",
    headingAccent: "WIRED FOR THE JOB YOU WANT.",
    lead:
      "You troubleshoot with a meter, bend conduit, pull and terminate, wire panels and controls, and work to code. A generic resume flattens that into “electrical work.” TRADE HUSTL3 turns your diagnostics, installs, and the systems you know into an ATS-ready electrician resume — apprentice, journeyman, or maintenance electrician.",
    ctaLabel: "Build my electrician resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "Any level", label: "Apprentice to journeyman" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your electrician resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed electrician resume · watermarked preview before payment",
      "Licenses, apprenticeship hours, and certs placed where ATS looks first",
      "ATS-friendly structure across the Electrical track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my electrician resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "AN ELECTRICIAN RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Speaks the trade",
        items: [
          "Troubleshooting, terminations, conduit, panels, motor controls, and code — the language contractors and applicant tracking systems expect, not “did electrical.”",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "Your license or apprenticeship hours, the gear you’ve wired, the calls you can run solo. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "Right for your level",
        items: [
          "Apprentice, journeyman, master, or maintenance electrician — the intake builds around the hours and work you actually have.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR ELECTRICIANS AT EVERY LEVEL",
    items: [
      "Apprentice electricians applying for the next program or contractor",
      "Journeyman electricians moving to a better shop or market",
      "Residential, commercial, and industrial electricians",
      "Maintenance and plant electricians (controls, PLCs, motors)",
      "Electrical technicians and low-voltage / data techs",
      "Master electricians and foremen",
      "Electricians relocating to a new state or returning to the trade",
      "Helpers and pre-apprentices with school or hands-on hours",
    ],
  },

  skills: {
    kicker: "/ ELECTRICIAN RESUME SKILLS",
    heading: "THE ELECTRICAL SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you can stand behind on a service call — the builder never claims a skill you didn’t enter. Grouped the way an electrician’s resume reads.",
    groups: [
      {
        label: "Troubleshooting & testing",
        items: [
          "Multimeter & clamp-meter diagnostics",
          "Voltage, current & resistance testing",
          "Continuity & insulation resistance (megger)",
          "Circuit tracing & fault isolation",
          "Reading schematics & wiring diagrams",
          "Control-circuit / ladder-logic troubleshooting",
          "Basic thermal / infrared scanning",
        ],
      },
      {
        label: "Rough-in & installation",
        items: [
          "EMT, rigid & PVC conduit bending",
          "MC / AC cable and wire pulling",
          "Device & fixture rough-in and trim-out",
          "Panel, sub-panel & load-center installation",
          "Terminations & torque-to-spec",
          "Grounding & bonding",
          "Cable tray & raceway",
        ],
      },
      {
        label: "Systems & equipment",
        items: [
          "Motor controls, starters & VFDs",
          "Contactors, relays & timers",
          "Transformers & disconnects",
          "Lighting controls & retrofits",
          "Generators & transfer switches",
          "Low-voltage, data & fire alarm (as applicable)",
          "PLC I/O wiring (maintenance electricians)",
        ],
      },
      {
        label: "Code, safety & site",
        items: [
          "NEC familiarity & code compliance",
          "Lockout/tagout (LOTO)",
          "PPE & arc-flash awareness (NFPA 70E)",
          "Service calls & work orders",
          "Blueprint & one-line reading",
          "Basic load calculations",
          "Permit & inspection support",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ LICENSES & CREDENTIALS",
    heading: "LIST ONLY WHAT YOU HOLD",
    intro:
      "Electrical postings screen hard on licensing — and they’re specific. List exactly what you hold, with the state and year. Not every electrician is a journeyman or master; registered apprenticeship hours count on their own. The builder never adds a license you didn’t enter.",
    items: [
      "State electrical apprentice registration / hours logged",
      "Journeyman electrician license (state or municipal)",
      "Master electrician license",
      "Electrical contractor license",
      "IBEW / IEC / ABC apprenticeship (year and hours)",
      "OSHA 10 / OSHA 30",
      "NFPA 70E arc-flash / electrical safety",
      "First aid / CPR / AED",
      "Aerial & scissor lift, forklift",
      "Low-voltage / fire-alarm license (where applicable)",
    ],
    note:
      "Still an apprentice? That’s a strong resume on its own — list your registered hours, the program, and the work you’ve done under a licensed electrician. The builder builds around your real level.",
  },

  tools: {
    kicker: "/ TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS YOU RUN",
    intro:
      "The tools and test equipment you name tell a foreman what you can be handed on day one. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Test & diagnostic",
        items: [
          "Digital multimeter & clamp meter",
          "Non-contact voltage tester",
          "Insulation resistance tester (megger)",
          "Circuit / breaker finder",
          "Receptacle & GFCI analyzer",
          "Phase rotation meter",
          "Basic thermal camera",
        ],
      },
      {
        label: "Bending & installation",
        items: [
          "Hand & hydraulic conduit benders",
          "Knockout punch set",
          "Cable tugger, fish tape & rods",
          "Wire strippers & crimpers",
          "Torque screwdriver & wrench",
          "Hole saws & step bits",
          "Cordless drill / impact & SDS hammer",
        ],
      },
      {
        label: "Hand & layout",
        items: [
          "Linesman & needle-nose pliers",
          "Screwdrivers & nut drivers",
          "Level, laser & measuring tools",
          "Labeling & circuit-ID tools",
          "Reciprocating saw",
          "Ladders, lifts & fall protection",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ ELECTRICIAN RESUME EXAMPLES",
    heading: "EXAMPLE ELECTRICIAN ACCOMPLISHMENT BULLETS",
    intro:
      "Electrical work becomes stronger resume bullets when it names the system, the scope, and a result. Examples of the shape a good electrician bullet takes:",
    examples: [
      "Troubleshot and repaired 120/240V and 3-phase circuits, motor starters, and lighting on commercial service calls, 6–10 calls per day.",
      "Roughed in and trimmed 30+ residential units, bending EMT and pulling MC to panel, on a multifamily new-construction crew.",
      "Terminated and torqued 200A and 400A services and sub-panels to spec; performed grounding and bonding to NEC.",
      "Retrofit building lighting to LED with occupancy controls across 40,000 sq ft, cutting connected lighting load about 35%.",
      "Replaced contactors, overloads, and VFDs on plant conveyor motors; reduced unplanned electrical downtime over two quarters.",
      "Logged 4,000+ registered apprenticeship hours across residential and commercial work under a licensed journeyman; completed OSHA 30 and NFPA 70E.",
      "Entry level: completed an electrical certificate with conduit-bending, terminations, and motor-control lab hours; registered as a state electrical apprentice.",
    ],
    disclaimer:
      "These are examples of how electrical work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience, hours, or licenses.",
  },

  howItWorks: HOW_IT_WORKS("electrician", "Electrical", "systems, controls, and code"),

  ats: {
    heading: "BUILT TO CLEAR ELECTRICAL ATS SCREENS",
    body: [
      "Most electrician applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Licenses & Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: troubleshooting, conduit, terminations, panels, motor controls, NEC, lockout/tagout, service calls.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned electrician resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ ELECTRICIAN RESUME FAQ",
    heading: "ELECTRICIAN RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should an electrician resume include?",
        answer:
          "Contact details and a target title, a short summary, your license or registered apprenticeship hours, certifications (OSHA, NFPA 70E) with years, a skills section grouped by type of work, work history that names the systems and gear you wired and the code you worked to, and measurable results such as calls per day, units roughed in, or downtime reduced. The TRADE HUSTL3 builder walks you through each one.",
      },
      {
        question: "What skills should I put on an electrician resume?",
        answer:
          "List only skills you can stand behind: troubleshooting with a meter, circuit tracing, conduit bending (EMT, rigid, PVC), wire pulling and terminations, panel and sub-panel installation, grounding and bonding, motor controls and VFDs, lighting controls, and NEC code compliance. Add lockout/tagout and arc-flash awareness. Group them so a foreman can scan them fast.",
      },
      {
        question: "How do I put my electrician license on a resume?",
        answer:
          "State the exact credential, the issuing state or city, and the year — for example “Journeyman Electrician, Ohio, 2022.” If you’re an apprentice, list your registered hours and program (IBEW, IEC, ABC, or state). Don’t imply a journeyman or master license you don’t hold; the builder only includes what you enter.",
      },
      {
        question: "How do I write an apprentice electrician resume?",
        answer:
          "Lead with your registered apprenticeship hours and program, then the work you’ve done under a licensed electrician — rough-in, terminations, conduit, troubleshooting support — plus school lab hours, OSHA 10, and the tools you own. The intake has an entry-level path built for apprentices and pre-apprentices.",
      },
      {
        question: "What is the difference between a journeyman and an apprentice electrician resume?",
        answer:
          "An apprentice resume emphasizes hours logged, the program, school, and supervised work. A journeyman resume emphasizes the license, the calls and installs you run independently, code knowledge, and results. Paste your target posting and the builder prioritizes the language that matches that role.",
      },
      {
        question: "Can I use this for a maintenance or industrial electrician job?",
        answer:
          "Yes. The Electrical track covers motor controls, VFDs, PLC I/O, transformers, and plant troubleshooting alongside residential and commercial work. Add the controls platforms and equipment you’ve worked on in your own words.",
      },
      {
        question: "Are there electrician resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong electrical line — system, scope, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR ELECTRICIAN RESUME, BUILT RIGHT.",
    body: "Guided electrical intake. License and apprenticeship hours up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my electrician resume",
  },
};

// ===========================================================================
// Plumbing
// ===========================================================================

export const PLUMBING_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("Plumbing"),
  trade: "Plumbing",
  shortName: "Plumbing Resume Builder",
  breadcrumbName: "Plumbing",
  analyticsItem: "resume_builder_plumbing",
  ctaLocations: {
    header: "plumbing_header",
    hero: "plumbing_hero",
    pricing: "plumbing_pricing",
    closing: "plumbing_footer_cta",
  },
  seoTitle: "Plumbing Resume Builder | Plumber Resume | TRADE HUSTL3",
  seoDescription:
    "Turn your service calls, rough-in, fixture sets, and drain and water-heater work into an ATS-ready plumber resume. $9.99 one-time, no subscription. TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "plumbing resume builder",
    "plumber resume builder",
    "plumber resume",
    "plumbing technician resume",
    "plumber resume examples",
    "plumber resume skills",
    "service plumber resume",
    "plumbing maintenance resume",
  ],

  hero: {
    kicker: "/ PLUMBING RESUME BUILDER",
    heading: "A PLUMBER RESUME BUILT",
    headingAccent: "FROM THE MAIN TO THE FIXTURE.",
    lead:
      "You run service calls, rough in DWV and water lines, set fixtures, clear drains, and swap water heaters — often to code and under pressure. A generic resume flattens that into “plumbing work.” TRADE HUSTL3 turns your systems, tools, and completed jobs into an ATS-ready plumber resume.",
    ctaLabel: "Build my plumber resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "Any level", label: "Apprentice to master" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your plumber resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed plumber resume · watermarked preview before payment",
      "Licenses, apprenticeship hours, and certs placed where ATS looks first",
      "ATS-friendly structure across the Plumbing track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my plumber resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "A PLUMBER RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Speaks plumbing",
        items: [
          "DWV, supply, fixtures, drains, water heaters, backflow, and code — the language service managers and applicant tracking systems expect, not “handyman.”",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "Your license or apprenticeship hours, the systems you can run solo, the callbacks you’ve avoided. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "Right for your level",
        items: [
          "Apprentice, journeyman, or master — the intake builds around the hours and work you actually have.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR PLUMBERS AT EVERY LEVEL",
    items: [
      "Apprentice plumbers applying for the next program or shop",
      "Journeyman and master plumbers moving to a better company",
      "Service and repair plumbers, residential and commercial",
      "New-construction and remodel plumbers (rough-in and trim)",
      "Maintenance plumbers at hospitals, schools, plants, and property groups",
      "Drain, sewer, and hydro-jetting technicians",
      "Plumbers relocating to a new state or returning to the trade",
      "Helpers and pre-apprentices with school or field hours",
    ],
  },

  skills: {
    kicker: "/ PLUMBING RESUME SKILLS",
    heading: "THE PLUMBING SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you can back up on a service call — the builder never claims a skill you didn’t enter. Grouped the way a plumber’s resume reads.",
    groups: [
      {
        label: "Rough-in & piping",
        items: [
          "DWV (drain, waste, vent) rough-in",
          "Water distribution — copper, PEX, CPVC, PVC",
          "Soldering, brazing, press & solvent-weld joints",
          "Pipe threading & cutting",
          "Slab, underground & main-line work",
          "Pressure testing & inspection prep",
          "Gas piping (where licensed)",
        ],
      },
      {
        label: "Service & repair",
        items: [
          "Fixture install & trim — toilets, faucets, sinks, tubs",
          "Faucet & valve rebuilds, cartridge swaps",
          "Water heater & tankless install and repair",
          "Leak detection & diagnosis",
          "Drain cleaning, augering & hydro-jetting",
          "Shutoffs, supply lines & angle stops",
          "Sump, sewage & booster pumps",
        ],
      },
      {
        label: "Systems & equipment",
        items: [
          "Backflow preventers & testing (where certified)",
          "Recirculation & hydronic lines",
          "Grease traps & interceptors",
          "Water softeners & filtration",
          "Well & pressure-tank systems",
          "Sewer camera & line locating",
          "Fixture carriers & specialty valves",
        ],
      },
      {
        label: "Code, safety & site",
        items: [
          "Local plumbing / IPC / UPC code familiarity",
          "Permit & inspection support",
          "Isometric & plumbing-plan reading",
          "Confined space & trench safety awareness",
          "Lockout/tagout & PPE",
          "Service calls, dispatch & work orders",
          "Customer communication & write-ups",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ LICENSES & CREDENTIALS",
    heading: "LIST ONLY WHAT YOU HOLD",
    intro:
      "Plumbing postings screen hard on licensing, and it’s state- and city-specific. List exactly what you hold, with the jurisdiction and year. Not every plumber is a journeyman or master — registered apprenticeship hours count on their own. The builder never adds a license you didn’t enter.",
    items: [
      "Registered plumbing apprentice / hours logged",
      "Journeyman plumber license (state or municipal)",
      "Master plumber license",
      "Plumbing contractor license",
      "Backflow prevention assembly tester certification",
      "Medical gas installer / brazer (NITC) — where applicable",
      "Gas fitter license (where separate)",
      "OSHA 10 / OSHA 30",
      "Confined space entry",
      "First aid / CPR / AED",
    ],
    note:
      "Still an apprentice? That’s a strong resume on its own — list your registered hours, the program, and the work you’ve done under a licensed plumber. The builder builds around your real level.",
  },

  tools: {
    kicker: "/ TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS YOU RUN",
    intro:
      "The tools you name tell a service manager what you can be sent out to handle alone. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Pipe & joining",
        items: [
          "Pipe wrenches & basin wrench",
          "Tubing & PVC cutters",
          "Press tool (ProPress / MegaPress)",
          "Torch & soldering kit",
          "PEX crimp / expansion tools",
          "Pipe threader & reamer",
          "Deburring & flaring tools",
        ],
      },
      {
        label: "Drain & diagnostics",
        items: [
          "Hand & drum augers (closet / sink)",
          "Sectional / drum machine",
          "Hydro-jetter",
          "Sewer inspection camera & locator",
          "Manometer & test gauges",
          "Leak & moisture detector",
          "Borescope",
        ],
      },
      {
        label: "Hand & site",
        items: [
          "Channel locks & adjustable wrenches",
          "Cordless drill / impact & SDS hammer",
          "Reciprocating saw & hole saws",
          "Levels & measuring tools",
          "Shop vac & pump-out",
          "Ladders & basic shoring",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ PLUMBER RESUME EXAMPLES",
    heading: "EXAMPLE PLUMBER ACCOMPLISHMENT BULLETS",
    intro:
      "Plumbing work becomes stronger resume bullets when it names the system, the volume, and a result. Examples of the shape a good plumber bullet takes:",
    examples: [
      "Ran 6–10 residential service calls per day — fixture repairs, water heaters, drain stoppages, and leak diagnosis — with a first-visit fix rate above 85%.",
      "Roughed in DWV and PEX water lines for 20+ units on a multifamily new-construction crew, passing rough inspection on the first walk.",
      "Replaced 40-, 50-, and 75-gallon tank and tankless water heaters, including gas and venting, to local code.",
      "Cleared main-line stoppages with sectional and jetting equipment; camera-located breaks and marked them for excavation.",
      "Set and trimmed toilets, faucets, tubs, and shower valves on a finish crew, holding punch callbacks under 3%.",
      "Tested backflow assemblies and submitted reports to the water authority (certification held).",
      "Entry level: completed a plumbing certificate with DWV, water-distribution, and soldering lab hours; registered as a state plumbing apprentice; earned OSHA 10.",
    ],
    disclaimer:
      "These are examples of how plumbing work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience, hours, or licenses.",
  },

  howItWorks: HOW_IT_WORKS("plumber", "Plumbing", "systems, fixtures, and code"),

  ats: {
    heading: "BUILT TO CLEAR PLUMBING ATS SCREENS",
    body: [
      "Most plumbing applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Licenses & Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: service calls, rough-in, fixtures, drain cleaning, water heaters, code compliance, pressure testing.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned plumber resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ PLUMBING RESUME FAQ",
    heading: "PLUMBER RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should a plumber resume include?",
        answer:
          "Contact details and a target title, a short summary, your license or registered apprenticeship hours, certifications (OSHA, backflow) with years, a skills section grouped by type of work, work history that names the systems you piped and the code you worked to, and measurable results such as calls per day, units roughed in, or callback rate. The TRADE HUSTL3 builder walks you through each one.",
      },
      {
        question: "What skills should I put on a plumbing resume?",
        answer:
          "List only skills you can back up: DWV and water-distribution rough-in, soldering and press joints, fixture install and trim, water heater install, drain cleaning and jetting, leak diagnosis, and code compliance. Add the pipe materials you work in (copper, PEX, CPVC, PVC) and any backflow or gas certification. Group them so a service manager can scan them fast.",
      },
      {
        question: "How do I list my plumbing license on a resume?",
        answer:
          "State the exact credential, the issuing state or city, and the year — for example “Journeyman Plumber, Texas, 2021.” If you’re an apprentice, list your registered hours and program. Don’t imply a journeyman or master license you don’t hold; the builder only includes what you enter.",
      },
      {
        question: "How do I write an apprentice plumber resume?",
        answer:
          "Lead with your registered apprenticeship hours and program, then the work you’ve done under a licensed plumber — rough-in, fixture sets, drain work, service support — plus school lab hours, OSHA 10, and the tools you own. The intake has an entry-level path built for apprentices and helpers.",
      },
      {
        question: "What is the difference between a service plumber and a new-construction plumber resume?",
        answer:
          "A service resume emphasizes diagnostics, repairs, water heaters, drains, callback rate, and customer communication. A new-construction resume emphasizes rough-in volume, materials, inspections passed, and blueprint reading. Paste your target posting and the builder prioritizes the language that matches that role.",
      },
      {
        question: "Can I use this for a maintenance plumber job?",
        answer:
          "Yes. The Plumbing track covers institutional and facilities plumbing — fixtures, water heaters, pumps, backflow, and PM work — alongside service and construction. Add the buildings and systems you’ve maintained and any CMMS you’ve used.",
      },
      {
        question: "Are there plumber resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong plumbing line — system, volume, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR PLUMBER RESUME, BUILT RIGHT.",
    body: "Guided plumbing intake. License and apprenticeship hours up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my plumber resume",
  },
};

// ===========================================================================
// Welding & Fabrication
// ===========================================================================

export const WELDING_FABRICATION_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("Welding & Fabrication"),
  trade: "Welding & Fabrication",
  shortName: "Welding & Fabrication Resume Builder",
  breadcrumbName: "Welding & Fabrication",
  analyticsItem: "resume_builder_welding_fabrication",
  ctaLocations: {
    header: "welding_header",
    hero: "welding_hero",
    pricing: "welding_pricing",
    closing: "welding_footer_cta",
  },
  seoTitle: "Welding Resume Builder | Welder & Fabricator Resume | TRADE HUSTL3",
  seoDescription:
    "Turn your processes, positions, materials, and fit-up into an ATS-ready welder and fabricator resume. $9.99 one-time, no subscription. TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "welding resume builder",
    "welder resume",
    "welder resume builder",
    "welding resume examples",
    "welding resume skills",
    "fabrication resume",
    "welder fabricator resume",
    "mig welder resume",
    "tig welder resume",
  ],

  hero: {
    kicker: "/ WELDING & FABRICATION RESUME BUILDER",
    heading: "A WELDER RESUME",
    headingAccent: "READ IN EVERY POSITION.",
    lead:
      "You run bead in every position, read prints and weld symbols, fit up and tack, cut with plasma and oxy-fuel, and hold to code. A generic resume flattens that into “welding.” TRADE HUSTL3 turns your processes, positions, materials, and the code you’ve qualified to into an ATS-ready welder and fabricator resume.",
    ctaLabel: "Build my welding resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "All processes", label: "MIG · TIG · stick · flux-core" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your welder resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed welder resume · watermarked preview before payment",
      "AWS and code qualifications placed where ATS looks first",
      "ATS-friendly structure across the Welding & Fabrication track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my welding resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "A WELDER RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Speaks the trade",
        items: [
          "Processes, positions, joint types, materials, fit-up, and code — the language shop foremen and applicant tracking systems expect, not “metal work.”",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "The positions you’re tested in, the processes you run daily, the material you know cold. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "Certs stated precisely",
        items: [
          "AWS D1.1, ASME Section IX, API 1104, 6G — listed exactly as you hold them, with the process, position, and date.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR WELDERS AND FABRICATORS",
    items: [
      "Structural and combo welders moving to a better shop",
      "Pipe welders (6G, ASME Section IX, API 1104)",
      "Sheet-metal and stainless fabricators",
      "Welder-fitters and layout hands",
      "Production welders — robotic cell tending, jigs, fixtures",
      "Maintenance and millwright welders (repair, hard-facing)",
      "Apprentices and welding-school grads testing for a first job",
      "Welders relocating or returning to the trade",
    ],
  },

  skills: {
    kicker: "/ WELDING RESUME SKILLS",
    heading: "THE WELDING SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you can run and pass a test on — the builder never claims a process or position you didn’t enter. Grouped the way a welder’s resume reads.",
    groups: [
      {
        label: "Processes",
        items: [
          "GMAW / MIG (short-circuit, spray, pulse)",
          "FCAW (gas-shielded & self-shielded)",
          "GTAW / TIG (steel, stainless, aluminum)",
          "SMAW / stick (6010, 7018, low-hydrogen)",
          "SAW (submerged arc) — where applicable",
          "Oxy-fuel & carbon-arc gouging",
          "Robotic / hard-automation tending",
        ],
      },
      {
        label: "Positions & joints",
        items: [
          "Flat, horizontal, vertical, overhead (1G–4G / 1F–4F)",
          "Pipe positions 2G, 5G, 6G",
          "Fillet, groove, lap & corner joints",
          "Open-root & backing-bar",
          "Multi-pass, stringer & weave",
          "Out-of-position production welding",
        ],
      },
      {
        label: "Fabrication & layout",
        items: [
          "Blueprint & weld-symbol reading",
          "Tape, square & layout",
          "Fit-up, tacking & clamping",
          "Jigs, fixtures & positioners",
          "Plasma & track-torch cutting",
          "Grinding, blending & finishing",
          "Bandsaw, ironworker & press brake (as applicable)",
        ],
      },
      {
        label: "Materials, code & QC",
        items: [
          "Carbon steel, stainless, aluminum, chrome-moly",
          "Sheet, plate, structural shapes & pipe",
          "AWS D1.1 / D1.2 / D1.6 familiarity",
          "ASME Section IX, API 1104 (where qualified)",
          "Visual inspection & support for NDT (UT, RT, MT, PT)",
          "WPS / procedure adherence",
          "Hot-work permits & fire watch",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ CERTIFICATIONS & QUALIFICATIONS",
    heading: "LIST ONLY WHAT YOU’RE CURRENTLY QUALIFIED IN",
    intro:
      "Welding certs are specific — a process, a position, a material, a thickness, and a date. List exactly what you currently hold and can retest on. Continuity matters; note if a cert has lapsed. The builder never adds a qualification you didn’t enter.",
    items: [
      "AWS D1.1 structural (process / position)",
      "AWS D1.2 aluminum, D1.5 bridge, D1.6 stainless (as held)",
      "ASME Section IX (process / position / thickness)",
      "API 1104 pipeline",
      "6G pipe qualification",
      "AWS Certified Welder (national registry)",
      "Certified Welding Inspector (CWI) or CAWI",
      "OSHA 10 / OSHA 30",
      "Overhead crane / rigging, forklift",
      "Confined space & hexavalent-chromium awareness",
    ],
    note:
      "Testing soon or between certs? Say so plainly — “D1.1 3G/4G, tested 2024” or “ASME IX pending retest.” The builder reflects exactly what you enter.",
  },

  tools: {
    kicker: "/ EQUIPMENT & TOOLS",
    heading: "NAME THE EQUIPMENT YOU RUN",
    intro:
      "The machines and tools you name tell a foreman what cell or bay you can step into. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Welding machines",
        items: [
          "MIG / wire feeders (CV)",
          "TIG / high-frequency (AC/DC)",
          "Stick / engine-drive (CC)",
          "Multiprocess inverters",
          "Submerged-arc setups",
          "Spool guns & push-pull",
        ],
      },
      {
        label: "Cutting & prep",
        items: [
          "Plasma cutter & CNC table",
          "Oxy-fuel & track torch",
          "Carbon-arc gouging",
          "Angle & die grinders",
          "Bandsaw & cold saw",
          "Bevelers & pipe stands",
        ],
      },
      {
        label: "Layout, fit-up & measure",
        items: [
          "Squares, levels & tape",
          "Fit-up clamps, wedges & dogs",
          "Magnetic squares & pipe jacks",
          "Positioners & turning rolls",
          "Fillet & undercut gauges",
          "Bridge cams & digital calipers",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ WELDING RESUME EXAMPLES",
    heading: "EXAMPLE WELDER ACCOMPLISHMENT BULLETS",
    intro:
      "Welding work becomes stronger resume bullets when it names the process, the position, the material, and a result. Examples of the shape a good welder bullet takes:",
    examples: [
      "Ran FCAW and SMAW on structural beams and columns in all positions, passing AWS D1.1 3G/4G and holding weld reject rate under 2%.",
      "TIG-welded stainless and aluminum sheet and tube for food-grade fabrication, meeting cosmetic and pressure requirements.",
      "Fit up and welded carbon-steel pipe spools 2″–12″, open-root GTAW with FCAW fill and cap, to ASME Section IX.",
      "Cut and beveled plate on a CNC plasma table and prepped fit-up for a two-welder production cell, keeping the line supplied.",
      "Hard-faced and rebuilt worn bucket teeth and conveyor components in a maintenance shop, extending service life.",
      "Read shop drawings and weld symbols to lay out and tack weldments from jigs, reducing rework on repeat assemblies.",
      "Entry level: completed a welding program with SMAW, GMAW, FCAW, and GTAW lab hours; tested AWS D1.1 3G; earned OSHA 10 and hot-work training.",
    ],
    disclaimer:
      "These are examples of how welding work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent processes, positions, or certifications.",
  },

  howItWorks: HOW_IT_WORKS("welder", "Welding & Fabrication", "processes, positions, and code"),

  ats: {
    heading: "BUILT TO CLEAR WELDING ATS SCREENS",
    body: [
      "Most welding and fabrication applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications & Qualifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: MIG, TIG, flux-core, structural, pipe, 6G, blueprint reading, fit-up, AWS D1.1.",
      "No resume tool can promise an interview or a weld-test pass. A clean, keyword-aligned welder resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ WELDING RESUME FAQ",
    heading: "WELDER RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should a welder resume include?",
        answer:
          "Contact details and a target title, a short summary, your current certifications and qualifications (process, position, material, date), a skills section grouped by process and position, work history that names what you welded and the code you worked to, and measurable results such as reject/repair rate, footage, or joints per shift. The TRADE HUSTL3 builder walks you through each one.",
      },
      {
        question: "What skills should I put on a welding resume?",
        answer:
          "List only processes and positions you can run and retest on: MIG, TIG, stick, flux-core; flat through overhead and pipe positions (2G, 5G, 6G); fit-up, tacking, and layout; blueprint and weld-symbol reading; plasma and oxy-fuel cutting; and the materials you know (carbon steel, stainless, aluminum). Group them so a foreman can scan them fast.",
      },
      {
        question: "How do I list AWS or ASME certifications on a resume?",
        answer:
          "Be specific: the code, the process, the position, and the date — for example “AWS D1.1, FCAW, 3G/4G, 2024” or “ASME Section IX, GTAW, 6G, 2023.” If a cert has lapsed or you’re due to retest, say so. The builder only lists what you enter.",
      },
      {
        question: "How do I write a welding resume with no experience?",
        answer:
          "Lead with your welding program or apprenticeship, the processes and positions you trained and tested in, any AWS test you’ve passed, OSHA 10, hot-work training, and the equipment you’ve run. The intake has an entry-level path built for welding-school grads and helpers.",
      },
      {
        question: "What is the difference between a structural welder and a pipe welder resume?",
        answer:
          "A structural resume emphasizes FCAW/SMAW in all positions, AWS D1.1, and steel shapes and plate. A pipe resume emphasizes GTAW open-root, 5G/6G, ASME Section IX or API 1104, and spool fabrication. Paste your target posting and the builder prioritizes the language that matches that role.",
      },
      {
        question: "Can I use this for a fabricator or welder-fitter job?",
        answer:
          "Yes. The Welding & Fabrication track covers layout, fit-up, jigs and fixtures, cutting, and drawing reading alongside welding. Add the fabrication work and equipment you’ve run in your own words.",
      },
      {
        question: "Are there welder resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong welding line — process, position, material, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR WELDER RESUME, BUILT RIGHT.",
    body: "Guided welding intake. Certifications and qualifications up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my welding resume",
  },
};

// ===========================================================================
// Construction & Carpentry
// ===========================================================================

export const CONSTRUCTION_CARPENTRY_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("Construction & Carpentry"),
  trade: "Construction & Carpentry",
  shortName: "Construction & Carpentry Resume Builder",
  breadcrumbName: "Construction & Carpentry",
  analyticsItem: "resume_builder_construction_carpentry",
  ctaLocations: {
    header: "construction_header",
    hero: "construction_hero",
    pricing: "construction_pricing",
    closing: "construction_footer_cta",
  },
  seoTitle: "Carpenter & Construction Resume Builder | TRADE HUSTL3",
  seoDescription:
    "Turn your framing, finish, layout, and jobsite work into an ATS-ready carpenter and construction resume. $9.99 one-time, no subscription. TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "construction resume builder",
    "carpenter resume builder",
    "carpenter resume",
    "construction worker resume",
    "construction resume examples",
    "carpenter resume skills",
    "framing carpenter resume",
    "finish carpenter resume",
  ],

  hero: {
    kicker: "/ CONSTRUCTION & CARPENTRY RESUME BUILDER",
    heading: "A CARPENTER RESUME,",
    headingAccent: "FRAMED AND FINISHED RIGHT.",
    lead:
      "You frame walls and roofs off the prints, form and pour, hang doors and set trim, and keep the schedule. A generic resume flattens that into “construction.” TRADE HUSTL3 turns your scopes, tools, and completed work into an ATS-ready carpenter and construction resume.",
    ctaLabel: "Build my construction resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "Rough → finish", label: "Framing to trim" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your construction resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed construction resume · watermarked preview before payment",
      "OSHA cards and equipment certs placed where ATS looks first",
      "ATS-friendly structure across the Construction & Carpentry track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my construction resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "A CARPENTER RESUME, NOT A GENERIC ONE",
    items: [
      {
        label: "Speaks the trade",
        items: [
          "Framing, layout, formwork, finish, and punch — the language superintendents and applicant tracking systems expect, not “general construction.”",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "The scopes you can run, the crew you’ve led, the schedule you’ve kept. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "Rough or finish, or both",
        items: [
          "The intake builds around the carpentry you actually do — wall and roof framing, concrete forms, doors and trim, cabinets, decks.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR CONSTRUCTION AND CARPENTRY WORK",
    items: [
      "Framing and rough carpenters moving up to lead or foreman",
      "Finish and trim carpenters — doors, base, casing, stairs, cabinets",
      "Form carpenters and concrete crews",
      "Remodel and residential carpenters",
      "Commercial and multifamily carpenters",
      "Construction laborers building toward a carpentry role",
      "Apprentices and trade-school grads applying for a first crew",
      "Carpenters relocating or returning to the trade",
    ],
  },

  skills: {
    kicker: "/ CARPENTRY RESUME SKILLS",
    heading: "THE CARPENTRY SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you can run on a crew — the builder never claims a skill you didn’t enter. Grouped the way a carpenter’s resume reads.",
    groups: [
      {
        label: "Rough carpentry & framing",
        items: [
          "Wall, floor & roof framing",
          "Layout from plans — lines, grade, elevations",
          "Sheathing, blocking & bracing",
          "Stairs & rough openings",
          "Truss & joist setting",
          "Steel-stud framing",
          "Structural repairs & shoring",
        ],
      },
      {
        label: "Finish carpentry",
        items: [
          "Door hanging & hardware",
          "Base, casing, crown & build-ups",
          "Window & trim install",
          "Cabinet & countertop set",
          "Stair treads, risers & railing",
          "Paneling, wainscot & closet systems",
          "Caulk, fill & punch-out",
        ],
      },
      {
        label: "Concrete, exterior & systems",
        items: [
          "Formwork — footings, walls, flatwork",
          "Rebar tie & embeds",
          "Deck & railing framing",
          "Siding, soffit & fascia",
          "Drywall hang & patch",
          "Insulation & vapor barrier",
          "Weather barrier & flashing",
        ],
      },
      {
        label: "Layout, safety & site",
        items: [
          "Blueprint & spec reading",
          "Tape, square, laser & transit",
          "Material takeoff & staging",
          "Demolition & site prep",
          "Ladder, scaffold & fall protection",
          "OSHA 10 / 30 & jobsite safety",
          "Punch lists, QC & cleanup",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ CARDS & CREDENTIALS",
    heading: "LIST WHAT YOU ACTUALLY HOLD",
    intro:
      "Carpentry rarely requires a license, so cards and training carry weight. List the ones you hold, with the year — the builder never adds one you didn’t enter.",
    items: [
      "OSHA 10 / OSHA 30 construction",
      "Carpentry apprenticeship (union or non-union) — year / hours",
      "NCCER core / carpentry",
      "Scaffold user / competent-person",
      "Forklift / telehandler",
      "Aerial & scissor lift",
      "Fall protection / competent-person",
      "Silica (respirable crystalline) awareness",
      "First aid / CPR",
      "Powder-actuated tool operator",
    ],
    note:
      "No cards yet? List your hands-on scopes and any trade-school or apprenticeship hours. The builder builds around the work you can actually do.",
  },

  tools: {
    kicker: "/ TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS YOU RUN",
    intro:
      "The tools you name tell a foreman what you can be handed on day one. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Framing & cutting",
        items: [
          "Framing & finish nailers",
          "Circular saw & track saw",
          "Miter & table saw",
          "Reciprocating saw",
          "Rotary hammer & powder-actuated tool",
          "Chalk line, speed square & framing square",
        ],
      },
      {
        label: "Finish & layout",
        items: [
          "Trim router & jigs",
          "Laser level & transit / builder’s level",
          "Pocket-hole jig",
          "Doweling & biscuit joiner",
          "Levels, blocks & shims",
          "Tape, marking & scribe tools",
        ],
      },
      {
        label: "Concrete & site",
        items: [
          "Concrete vibrator & screed",
          "Bull float & hand tools",
          "Form ties & wedge tools",
          "Skid steer / mini-ex (as applicable)",
          "Scaffold & pump jacks",
          "Generators, compressors & site power",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ CONSTRUCTION RESUME EXAMPLES",
    heading: "EXAMPLE CARPENTRY ACCOMPLISHMENT BULLETS",
    intro:
      "Construction work becomes stronger resume bullets when it names the scope, the volume, and a result. Examples of the shape a good carpentry bullet takes:",
    examples: [
      "Framed walls, floors, and roofs for 15+ single-family homes from prints, keeping the crew ahead of the framing schedule.",
      "Ran layout for a commercial tenant build-out — grid lines, partitions, and door openings — with rework held under 2%.",
      "Hung 60+ pre-hung and slab doors per project and set base, casing, and crown on a finish crew.",
      "Built and stripped wall and footing forms for a foundation package, tying rebar and setting embeds to plan.",
      "Set kitchen and bath cabinets and countertops on a remodel crew, holding punch callbacks low.",
      "Led a 3-person crew on framing scopes, handling layout, cut lists, and daily QC walks.",
      "Entry level: completed a carpentry certificate with framing, layout, and finish lab hours; earned OSHA 10 and scaffold-user training.",
    ],
    disclaimer:
      "These are examples of how construction work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience or numbers.",
  },

  howItWorks: HOW_IT_WORKS("construction", "Construction & Carpentry", "scopes, tools, and layout"),

  ats: {
    heading: "BUILT TO CLEAR CONSTRUCTION ATS SCREENS",
    body: [
      "Most construction and carpentry applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: framing, finish carpentry, layout, blueprint reading, formwork, punch list, OSHA.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned construction resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ CONSTRUCTION RESUME FAQ",
    heading: "CARPENTRY RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should a carpenter resume include?",
        answer:
          "Contact details and a target title, a short summary, your OSHA cards and any apprenticeship hours, a skills section grouped by rough and finish work, work history that names the scopes you ran and the plans you worked from, and measurable results such as homes framed, doors hung, crew size, or schedule kept. The TRADE HUSTL3 builder walks you through each one.",
      },
      {
        question: "What skills should I put on a construction resume?",
        answer:
          "List only skills you can run on a crew: wall and roof framing, layout from prints, formwork, door hanging and trim, cabinet setting, drywall, decks, and punch-out. Add blueprint reading, the power and layout tools you use, and OSHA training. Group them by rough and finish so a superintendent can scan them fast.",
      },
      {
        question: "Do I need a license or certification for construction or carpentry?",
        answer:
          "Carpentry usually doesn’t require a license. OSHA 10 or 30, an apprenticeship, scaffold and lift cards, and fall-protection training all help. List what you hold with the year. The builder never adds a card you didn’t enter.",
      },
      {
        question: "How do I write a construction resume with no experience?",
        answer:
          "Lead with a carpentry or construction certificate, apprenticeship hours, OSHA 10, the tools you own, and any related work — labor, landscaping, warehouse, or demolition. The intake has an entry-level path that builds around training and hands-on scopes instead of years.",
      },
      {
        question: "What is the difference between a framing carpenter and a finish carpenter resume?",
        answer:
          "A framing resume emphasizes layout, walls and roofs, sheathing, and production pace. A finish resume emphasizes doors, trim, cabinets, stairs, and callback rate. Paste your target posting and the builder prioritizes the language that matches that role.",
      },
      {
        question: "Can I use this for a general construction laborer role?",
        answer:
          "Yes — though the General Labor guide may fit better if your work is mostly material handling, demolition, and site support. This page leans toward carpentry scopes. Add the work you actually do and the builder emphasizes it.",
      },
      {
        question: "Are there carpenter resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong carpentry line — scope, volume, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR CARPENTER RESUME, BUILT RIGHT.",
    body: "Guided construction intake. OSHA cards and apprenticeship hours up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my construction resume",
  },
};

// ===========================================================================
// General Labor / Maintenance (General Labor / Trade Helper track)
// ===========================================================================

export const GENERAL_LABOR_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("General Labor / Trade Helper"),
  trade: "General Labor / Trade Helper",
  shortName: "General Labor Resume Builder",
  breadcrumbName: "General Labor / Maintenance",
  analyticsItem: "resume_builder_general_labor",
  ctaLocations: {
    header: "general_labor_header",
    hero: "general_labor_hero",
    pricing: "general_labor_pricing",
    closing: "general_labor_footer_cta",
  },
  seoTitle: "General Labor Resume Builder | Laborer & Maintenance | TRADE HUSTL3",
  seoDescription:
    "Turn your material handling, basic repairs, and work-order support into an ATS-ready general labor and maintenance resume. $9.99 one-time, no subscription. TRADE HUSTL3.",
  ogImage: "/optimized/og.webp",
  targetQueries: [
    "general labor resume builder",
    "general labor resume",
    "laborer resume",
    "maintenance worker resume",
    "maintenance technician resume builder",
    "maintenance technician resume",
    "skilled labor resume",
    "maintenance tech resume",
  ],

  hero: {
    kicker: "/ GENERAL LABOR & MAINTENANCE RESUME BUILDER",
    heading: "A GENERAL LABOR RESUME",
    headingAccent: "THAT SHOWS YOUR RANGE.",
    lead:
      "You move and stage material, run basic repairs, cover work orders, set up and tear down, and jump between departments. A generic resume flattens that into “general labor.” TRADE HUSTL3 turns the tasks you handle, the tools you run, and the results you get into an ATS-ready general labor and maintenance resume.",
    ctaLabel: "Build my resume",
    proofStats: [
      { value: "$9.99", label: "One-time · no subscription" },
      { value: "Cross-trade", label: "Labor + light maintenance" },
      { value: "3", label: "Corrections within 7 days" },
    ],
  },

  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Your resume is built before checkout. Review the watermarked preview, then pay once to remove the watermark.",
    bullets: [
      "One completed resume · watermarked preview before payment",
      "Certifications, safety training, and equipment cards placed where ATS looks first",
      "ATS-friendly structure across the General Labor & Maintenance track",
      "Up to 3 corrections within 7 days",
      "Clean PDF + editable DOCX after payment",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my resume",
  },

  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "A LABOR RESUME, NOT A VAGUE ONE",
    items: [
      {
        label: "Shows range, not filler",
        items: [
          "Material handling, basic repairs, PMs, work orders, and safety — named specifically, the way supervisors and applicant tracking systems read them.",
        ],
      },
      {
        label: "Built on your facts",
        items: [
          "The tasks you actually cover, the equipment you run, the training you hold. Nothing is added that you didn’t enter.",
        ],
      },
      {
        label: "Bridges labor and maintenance",
        items: [
          "Written for workers whose duties cross departments — grounds, warehouse, basic trades support, and facility upkeep.",
        ],
      },
      {
        label: "$9.99 once",
        items: [
          "Preview the watermarked resume before you pay. No subscription. Up to 3 corrections within 7 days, then a clean PDF and editable DOCX.",
        ],
      },
    ],
  },

  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "BUILT FOR CROSS-FUNCTIONAL LABOR AND MAINTENANCE",
    items: [
      "General laborers and warehouse / production associates",
      "Maintenance helpers and building-service workers",
      "Groundskeepers and custodial crews moving into maintenance",
      "Trade helpers and pre-apprentices — HVAC, electrical, plumbing support",
      "Facility and warehouse support techs who cover a bit of everything",
      "Movers, material handlers, and equipment-setup crews",
      "Entry-level maintenance techs building toward a specialized trade",
      "Workers relocating or returning to steady labor work",
    ],
  },

  skills: {
    kicker: "/ GENERAL LABOR RESUME SKILLS",
    heading: "THE LABOR & MAINTENANCE SKILLS EMPLOYERS SCAN FOR",
    intro:
      "Pick what you actually do on shift — the builder never claims a skill you didn’t enter. Grouped the way a labor-and-maintenance resume reads.",
    groups: [
      {
        label: "Maintenance & repairs",
        items: [
          "Preventive maintenance — filters, belts, lubrication",
          "Basic repairs — fixtures, hardware, hinges, locks",
          "Light electrical — outlets, switches, lamps, breaker resets",
          "Light plumbing — faucets, flush valves, supply lines, clogs",
          "Basic HVAC support — filter changes, coil cleaning, assist",
          "Painting, patching & drywall repair",
          "Door, window & hardware adjustment",
        ],
      },
      {
        label: "Work orders & documentation",
        items: [
          "Work-order intake, updates & close-out",
          "CMMS / mobile work-order apps",
          "Inspections, rounds & checklists",
          "Parts pickup & inventory stocking",
          "Photo documentation & completion notes",
          "Reporting issues to the right trade",
          "After-hours / emergency response support",
        ],
      },
      {
        label: "Material handling & site",
        items: [
          "Loading, unloading & staging material",
          "Pallet jack & hand truck",
          "Forklift / lift operation (if certified)",
          "Equipment and event setup / teardown",
          "Demolition & debris removal",
          "Grounds — mowing, trimming, snow, salt",
          "Facility & warehouse cleanup",
        ],
      },
      {
        label: "Safety & reliability",
        items: [
          "Lifting technique & team lifts",
          "PPE and hazard awareness",
          "Lockout/tagout (basic)",
          "Ladder & scaffold safety",
          "Spill and slip/trip response",
          "Dependable attendance & punctuality",
          "Following instructions & jobsite communication",
        ],
      },
    ],
  },

  certifications: {
    kicker: "/ TRAINING & CARDS",
    heading: "LIST WHAT YOU ACTUALLY HOLD",
    intro:
      "Most general-labor roles don’t require a certification. The ones that help are safety and equipment cards. List what you hold, with the year — the builder never adds one you didn’t enter.",
    items: [
      "OSHA 10 / OSHA 30",
      "Forklift / powered-industrial-truck operator",
      "Aerial & scissor lift",
      "Certified Apartment Maintenance Technician (CAMT) — if held",
      "EPA Section 608 — if held",
      "Certified Pool/Spa Operator (CPO) — if held",
      "First aid / CPR / AED",
      "Flagger / traffic control",
      "Confined space entry (awareness)",
      "CDL (any class) — if held",
    ],
    note:
      "No cards yet? That’s common for this work. List the tasks you can do reliably and any safety training, and the builder builds around those.",
  },

  tools: {
    kicker: "/ TOOLS & EQUIPMENT",
    heading: "NAME THE TOOLS AND EQUIPMENT YOU RUN",
    intro:
      "The tools and equipment you name show a supervisor you can be put to work without hand-holding. Add the ones you use — in your own words.",
    groups: [
      {
        label: "Hand & power tools",
        items: [
          "Cordless drill / impact driver",
          "Screwdrivers, wrenches & pliers",
          "Reciprocating & circular saw",
          "Basic multimeter / voltage tester",
          "Caulk gun & putty tools",
          "Shop vac & blower",
        ],
      },
      {
        label: "Material handling",
        items: [
          "Pallet jack & hand truck",
          "Forklift / order picker (if certified)",
          "Dolly, cart & moving straps",
          "Floor scrubber / buffer",
          "Pressure washer",
          "Compactor / baler",
        ],
      },
      {
        label: "Grounds & site",
        items: [
          "Mower, trimmer & blower",
          "Snow blower & spreader",
          "Wheelbarrow & concrete hand tools",
          "Ladders & step platforms",
          "Generators & extension cords",
          "Debris carts & bins",
        ],
      },
    ],
  },

  accomplishments: {
    kicker: "/ LABOR RESUME EXAMPLES",
    heading: "EXAMPLE GENERAL LABOR & MAINTENANCE BULLETS",
    intro:
      "General labor and maintenance work becomes stronger resume bullets when it names the task, the volume, and a result. Examples of the shape a good bullet takes:",
    examples: [
      "Completed 15–25 work orders per week — light plumbing, hardware, lamp and filter changes, and painting — across a 250,000 sq ft facility.",
      "Loaded, unloaded, and staged material for three crews, keeping the jobsite stocked and clear.",
      "Ran quarterly PM checklists on exhaust fans, filters, and door hardware, logging completions in the CMMS.",
      "Supported HVAC and electrical techs on service calls — pulling wire, changing filters, and handling parts runs.",
      "Handled setup and teardown for 40+ events, including tables, staging, and equipment, on schedule.",
      "Ran demolition and debris removal on renovation projects, then handled final cleanup for handover.",
      "Maintained building grounds — mowing, trimming, and snow and ice removal — across a multi-building campus.",
      "Entry level: completed OSHA 10 and forklift certification; two years of warehouse and grounds work with a strong attendance record.",
    ],
    disclaimer:
      "These are examples of how labor and maintenance work turns into resume language. Your resume is built only from the details you enter — TRADE HUSTL3 matches wording, it does not invent experience or numbers.",
  },

  howItWorks: HOW_IT_WORKS("general labor", "General Labor / Trade Helper", "tasks, tools, and safety training"),

  ats: {
    heading: "BUILT TO CLEAR LABOR & MAINTENANCE ATS SCREENS",
    body: [
      "Most general-labor and maintenance applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: preventive maintenance, work orders, material handling, basic electrical, basic plumbing, forklift, safety.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faq: {
    kicker: "/ GENERAL LABOR RESUME FAQ",
    heading: "LABOR & MAINTENANCE RESUME QUESTIONS, ANSWERED",
    items: [
      {
        question: "What should a general labor resume include?",
        answer:
          "Contact details and a target title, a short summary, any safety or equipment training, a skills section grouped by task type, work history that names what you did and where, and measurable results such as work orders completed, loads moved, PMs done, or attendance. The TRADE HUSTL3 builder walks you through each one so “general labor” turns into something specific.",
      },
      {
        question: "How do I make a general labor resume not sound generic?",
        answer:
          "Name the tasks and the numbers. Instead of “general labor,” list the repairs you can do, the equipment you run, the work orders you close, and the departments you support. The intake prompts you for those specifics so the resume shows range instead of filler.",
      },
      {
        question: "Can this work for a maintenance technician job?",
        answer:
          "It can, if your work is entry-level or cross-department. If you run a full maintenance program with CMMS, PMs, and multi-trade repairs, the Facilities Maintenance guide is the better fit. This page is built for workers who bridge labor and light maintenance.",
      },
      {
        question: "How do I write a labor resume with no experience?",
        answer:
          "Lead with any safety training (OSHA 10), a forklift or lift card, physical-work history — warehouse, moving, landscaping, food service — and a reliable attendance record. The intake has an entry-level path that builds around dependability and the tasks you can do.",
      },
      {
        question: "What skills should I put on a maintenance helper resume?",
        answer:
          "List what you can do reliably: preventive maintenance basics, light plumbing and electrical, painting and patching, hardware and door work, material handling, work-order updates, and safety practices. Add the tools you run. Group them so a supervisor can scan them fast.",
      },
      {
        question: "Should I list forklift or OSHA cards?",
        answer:
          "Yes — near the top. Forklift certification, OSHA 10 or 30, and lift cards are among the first things a warehouse or facilities supervisor looks for. List each with the year. The builder only includes what you enter.",
      },
      {
        question: "Are there general labor resume examples I can follow?",
        answer:
          "This page lists example accomplishment bullets that show the shape of a strong labor-and-maintenance line — task, volume, result. Instead of copying a sample, you answer a guided intake and the builder turns your own work into that format, then shows a free preview before payment.",
      },
      {
        question: "What do I get, and what does it cost?",
        answer:
          "A one-time $9.99 payment unlocks a clean PDF and an editable DOCX. The preview is watermarked and free, and you review it before you pay. You get up to 3 corrections within 7 days. There is no subscription and no auto-renewal.",
      },
    ],
  },

  closingCta: {
    kicker: "/ READY WHEN YOU ARE",
    heading: "YOUR LABOR RESUME, BUILT RIGHT.",
    body: "Guided intake for cross-functional labor and maintenance work. Safety and equipment cards up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my resume",
  },
};

/** Every trade landing page in the site — drives the sitemap, the hub's trade
 *  links, and the sibling cross-links on each page. Order = display order. */
export const TRADE_LANDING_PAGES: TradeLandingContent[] = [
  HVAC_LANDING,
  FACILITIES_MAINTENANCE_LANDING,
  ELECTRICIAN_LANDING,
  PLUMBING_LANDING,
  WELDING_FABRICATION_LANDING,
  CONSTRUCTION_CARPENTRY_LANDING,
  GENERAL_LABOR_LANDING,
];

/** Landing page for a given intake trade, if one exists (used by the hub). */
export function tradeLandingForTrack(track: TradeTrack): TradeLandingContent | undefined {
  return TRADE_LANDING_PAGES.find((page) => page.trade === track);
}
