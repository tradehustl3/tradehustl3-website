/**
 * Content model for the trade-specific Resume Builder SEO landing pages.
 *
 * Each trade page (`/resume-builder/hvac`, and later electrician, plumbing,
 * facilities maintenance, …) is the same server-rendered <TradeLandingPage />
 * shell filled by one `TradeLandingContent` object. The shell guarantees a
 * consistent, crawlable structure and schema; the content object carries the
 * genuine trade-specific terminology that earns topical relevance. Keep the
 * copy real — specific certifications, tools, systems, and example bullets for
 * the trade — never a template with the trade name swapped in.
 */

import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "../site";
import type { TradeTrack } from "./trade-content";
import { slugForTradeTrack } from "./trade-preselect";

export type LabeledGroup = { label: string; items: string[] };
export type FaqItem = { question: string; answer: string };

export type TradeLandingContent = {
  /** Route slug, e.g. "hvac" for /resume-builder/hvac. Must be a canonical trade slug. */
  slug: string;
  /** The intake trade this page preselects. */
  trade: TradeTrack;
  /** Exact <title>. Rendered verbatim (no site template appended). */
  seoTitle: string;
  /** Exact meta description. */
  seoDescription: string;
  /** Absolute-path OG/Twitter image. */
  ogImage: string;
  /** Search intents this page targets, shown nowhere on the page — for docs/review only. */
  targetQueries: string[];

  hero: {
    eyebrow: string;
    heading: string;
    headingAccent: string;
    lead: string;
    ctaLabel: string;
  };
  valueProps: LabeledGroup[];
  whoItIsFor: string[];
  skills: {
    intro: string;
    groups: LabeledGroup[];
  };
  certifications: {
    intro: string;
    items: string[];
    note: string;
  };
  tools: {
    intro: string;
    groups: LabeledGroup[];
  };
  accomplishments: {
    intro: string;
    examples: string[];
    disclaimer: string;
  };
  howItWorks: { title: string; body: string }[];
  ats: {
    heading: string;
    body: string[];
  };
  faqs: FaqItem[];
  closingCta: {
    heading: string;
    body: string;
    ctaLabel: string;
  };
};

export function tradeLandingPath(content: TradeLandingContent): string {
  return `/resume-builder/${content.slug}`;
}

/** Page metadata for a trade landing page. Fully specifies OG/Twitter so nothing
 *  is inherited from the site root's `url: "/"`. */
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

/** WebPage + BreadcrumbList + FAQPage graph, matching the site's existing JSON-LD style. */
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
          { "@type": "ListItem", position: 3, name: content.hero.heading, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: content.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

// ===========================================================================
// HVAC & Refrigeration
// ===========================================================================

export const HVAC_LANDING: TradeLandingContent = {
  slug: slugForTradeTrack("HVAC & Refrigeration"),
  trade: "HVAC & Refrigeration",
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
    eyebrow: "/ HVAC & REFRIGERATION RESUME BUILDER",
    heading: "AN HVAC RESUME",
    headingAccent: "BUILT FROM THE ROOFTOP DOWN.",
    lead:
      "You diagnose refrigerant faults, troubleshoot contactors and capacitors, run PM routes, and braze line sets. Most resume tools flatten all of that into “performed HVAC maintenance.” TRADE HUSTL3 turns your EPA 608, the systems you’ve serviced, and your real field results into an ATS-ready HVAC technician resume.",
    ctaLabel: "Build my HVAC resume",
  },

  valueProps: [
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

  whoItIsFor: [
    "HVAC service technicians and maintenance techs moving to a better shop",
    "Installers and helpers stepping up to a lead or service-tech role",
    "Apprentices and trade-school grads applying for a first HVAC job",
    "Commercial refrigeration and rooftop-unit (RTU) technicians",
    "Facilities and building engineers whose day is mostly HVAC",
    "Techs relocating to a new state or market, or returning to the trade",
    "Military, maintenance, or electrical backgrounds moving into HVAC",
  ],

  skills: {
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
    heading: "Written to get through HVAC applicant tracking systems",
    body: [
      "Most HVAC applications are parsed by an applicant tracking system (ATS) before a person sees them. TRADE HUSTL3 uses standard section headings — Summary, Certifications, Skills, Experience, Education — and avoids the tables, columns, and graphics that trip parsers up.",
      "Paste the job posting into the intake and the builder prioritizes the language you already have that matches it: EPA 608, preventive maintenance, RTU, split system, heat pump, refrigerant, electrical troubleshooting, diagnostics.",
      "No resume tool can promise an interview or an “ATS pass rate.” A clean, keyword-aligned HVAC resume simply removes the reasons an automated screen filters you out.",
    ],
  },

  faqs: [
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

  closingCta: {
    heading: "Turn your HVAC field experience into a job-ready resume",
    body: "Guided HVAC intake. EPA 608 and certifications up top. ATS-friendly structure. Clean PDF and editable DOCX. One-time $9.99 — preview before you pay.",
    ctaLabel: "Build my HVAC resume",
  },
};

/** Every trade landing page in the site, keyed by slug (drives future sitemap/routing). */
export const TRADE_LANDING_PAGES: TradeLandingContent[] = [HVAC_LANDING];
