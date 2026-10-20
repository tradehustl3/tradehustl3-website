import type { TradeLandingContent } from "./trade-landing-content";

/**
 * Dedicated, evidence-led heavy equipment operator landing page.
 * Reuses the existing Roadwork/Paving/Concrete/Heavy Equipment guided track.
 * Do not treat illustrative work bullets as verified customer achievements.
 */
export const HEAVY_EQUIPMENT_OPERATOR_LANDING: TradeLandingContent = {
  slug: "heavy-equipment-operator",
  trade: "Roadwork, Paving, Concrete & Heavy Equipment",
  shortName: "Heavy Equipment Operator Resume Builder",
  breadcrumbName: "Heavy Equipment Operator",
  analyticsItem: "resume_builder_heavy_equipment_operator",
  ctaLocations: {
    header: "heavy_equipment_header",
    hero: "heavy_equipment_hero",
    pricing: "heavy_equipment_pricing_card",
    closing: "heavy_equipment_footer_cta",
  },
  seoTitle: "Heavy Equipment Operator Resume Example & Builder | TRADE HUSTL3",
  seoDescription:
    "See heavy equipment operator resume examples, excavator and dozer skills, safety credentials, and jobsite bullet tips. Preview free; unlock for $9.99 once.",
  ogImage: "/optimized/og-v2.webp",
  targetQueries: [
    "heavy equipment operator resume",
    "heavy equipment operator resume example",
    "heavy equipment operator resume skills",
    "excavator operator resume",
    "bulldozer operator resume",
    "equipment operator resume builder",
  ],

  hero: {
    kicker: "/ HEAVY EQUIPMENT OPERATOR RESUME BUILDER",
    heading: "YOUR EQUIPMENT SKILLS DESERVE",
    headingAccent: "MORE THAN A JOB TITLE.",
    lead:
      "You know the difference between running an excavator, finishing grade with a dozer, and loading trucks with a wheel loader. A generic resume rarely shows it. Build a heavy equipment operator resume around the machines you actually operate, the sitework you have done, and the safety practices you can verify.",
    ctaLabel: "Build my operator resume",
    proofStats: [
      { value: "$0", label: "Preview before payment" },
      { value: "Equipment", label: "Machine-specific experience" },
      { value: "$9.99", label: "One-time unlock · no subscription" },
    ],
  },
  pricing: {
    kicker: "/ ONE STRAIGHTFORWARD PACKAGE",
    heading: "PREVIEW FIRST. PAY ONCE.",
    subhead:
      "Build and review a watermarked heavy equipment operator resume before you decide to pay. The builder uses only details you provide.",
    bullets: [
      "One completed operator resume · free watermarked preview",
      "Equipment, projects, safety and training organized around your experience",
      "Matching cover letter included",
      "PDF + editable DOCX after payment",
      "Up to three AI-assisted correction runs within seven days",
      "No subscription · no auto-renewal",
    ],
    ctaLabel: "Build my operator resume",
  },
  valueProps: {
    kicker: "/ WHY THIS ONE",
    heading: "AN OPERATOR RESUME THAT NAMES THE MACHINES",
    items: [
      {
        label: "Equipment, not filler",
        items: [
          "Name excavators, dozers, wheel loaders, backhoes, graders, rollers or skid steers you have really operated, plus relevant attachments.",
        ],
      },
      {
        label: "Show the scope",
        items: [
          "Explain whether you performed trenching, bulk earthmoving, fine grading, loading, compaction, utility support or roadwork, and on what kinds of sites.",
        ],
      },
      {
        label: "Safety is specific",
        items: [
          "Describe pre-operation inspections, spotter communication, exclusion zones, underground utility precautions and documented training within your actual responsibilities.",
        ],
      },
      {
        label: "Preview before paying",
        items: [
          "Review the resume first. A $9.99 one-time purchase unlocks the clean PDF and editable DOCX with a matching cover letter.",
        ],
      },
    ],
  },
  whoItIsFor: {
    kicker: "/ WHO THIS IS FOR",
    heading: "FROM FIRST EQUIPMENT HOURS TO EXPERIENCED OPERATORS",
    items: [
      "Excavator, dozer, loader and skid steer operators applying to sitework contractors",
      "Heavy equipment operators moving between road, utility and commercial construction",
      "Operators documenting grading, trenching, compaction or truck-loading work",
      "Apprentices and equipment-school graduates with supervised seat time",
      "Laborers transitioning into equipment operation without overstating their experience",
      "Experienced operators moving toward foreman or equipment lead roles",
    ],
  },
  skills: {
    kicker: "/ OPERATOR RESUME SKILLS",
    heading: "SHOW THE WORK YOU CAN ACTUALLY RUN",
    intro:
      "Use only the machines and tasks you can explain in an interview. A machine you watched or trained on is not automatically a machine you independently operated.",
    groups: [
      {
        label: "Earthmoving and grading",
        items: [
          "Excavation and backfilling",
          "Bulk earthmoving and material stockpiling",
          "Rough grading and finish grading",
          "Cut-and-fill work to plans",
          "Slope, drainage and elevation control",
          "GPS/machine control, if actually used",
          "Trenching under site safety procedures",
        ],
      },
      {
        label: "Site, utility and paving",
        items: [
          "Underground utility and pipe crew support",
          "Truck loading and spoil management",
          "Aggregate placement and spreading",
          "Subgrade preparation and compaction",
          "Roadway and site access preparation",
          "Erosion-control and jobsite housekeeping",
          "Working around spotters and ground crews",
        ],
      },
      {
        label: "Inspection and coordination",
        items: [
          "Daily walkaround and pre-use inspections",
          "Fluid, tire/track and attachment checks",
          "Defect reporting and maintenance coordination",
          "Hand signals and radio communication",
          "Awareness of overhead and buried utilities",
          "Reading grade stakes and construction plans",
          "Daily equipment and production logs",
        ],
      },
    ],
  },
  tools: {
    kicker: "/ MACHINES, ATTACHMENTS & TECHNOLOGY",
    heading: "NAME THE EQUIPMENT ON YOUR RESUME",
    intro:
      "Equipment specificity helps an employer tell whether your experience fits the fleet and projects they operate. List models, capacities and control systems only when you know them.",
    groups: [
      {
        label: "Machines operated",
        items: [
          "Tracked or wheeled excavator",
          "Mini excavator",
          "Bulldozer / crawler tractor",
          "Wheel loader",
          "Skid steer / compact track loader",
          "Backhoe loader",
          "Motor grader",
          "Compactor / vibratory roller",
        ],
      },
      {
        label: "Attachments and grade controls",
        items: [
          "General-purpose, trenching and grading buckets",
          "Hydraulic hammer / breaker",
          "Auger and fork attachments",
          "Quick couplers",
          "Laser level / grade receiver",
          "GPS/GNSS machine guidance, if used",
          "Survey stakes and grade rods",
        ],
      },
      {
        label: "Daily operating tools",
        items: [
          "Pre-operation checklist",
          "Grease gun and fluid checks",
          "Two-way radio",
          "Site drawings and utility markings",
          "Inspection and hour-meter logs",
          "PPE and high-visibility gear",
          "Spotter hand signals",
        ],
      },
    ],
  },
  certifications: {
    kicker: "/ TRAINING & SAFETY",
    heading: "LIST TRAINING YOU HAVE ACTUALLY COMPLETED",
    intro:
      "Requirements vary by machine, worksite, employer and jurisdiction. These are possible credentials and training records—not universal legal requirements and not claims that you hold them.",
    items: [
      "OSHA 10 / OSHA 30 construction safety training, if completed",
      "NCCER Heavy Equipment Operations credential, if earned",
      "Recognized equipment-operator apprenticeship or training program",
      "Employer-specific equipment qualification or authorization",
      "Trenching/excavation hazard awareness or competent-person training, if completed",
      "Flagger / traffic-control certification, if applicable",
      "First aid / CPR, if current",
      "CDL class and endorsements, only for roles and vehicles requiring them",
    ],
    note:
      "Do not list a CDL as a universal requirement for heavy equipment operation. Distinguish classroom or simulator hours from supervised field hours and independent operation. Never invent a certification, license or qualification.",
  },
  accomplishments: {
    kicker: "/ HEAVY EQUIPMENT OPERATOR RESUME EXAMPLES",
    heading: "EXAMPLE BULLETS BUILT AROUND REAL JOBSITE PROOF",
    intro:
      "These examples illustrate the kind of specific work details to collect. Replace every bracket with a verified fact from your own records; delete anything you did not do.",
    examples: [
      "Operated [excavator model / class] to complete [type of trench or foundation excavation] on [verified project scope], coordinating with [crew or spotter].",
      "Used a [dozer / motor grader] for [rough or finish grading] against [plan or grade-stake requirements] on [actual project type].",
      "Loaded [verified number] truckloads of [material] with a [wheel loader] during [documented shift or project], maintaining clear loading and pedestrian zones.",
      "Performed and documented [daily / pre-shift] equipment inspections on [specific machines] and reported [actual defects or service needs].",
      "Supported [pipe / utility / drainage] crews with controlled trench excavation and backfilling under [site-approved procedures].",
      "Used [laser / GPS guidance / grade rod] to check [actual elevations or tolerances] during [project or task].",
      "Entry level: completed [verified training hours] on [equipment] through [program], including [supervised exercises]; do not represent training as paid operator experience.",
    ],
    disclaimer:
      "These are examples of how verified operator work turns into resume language, not customer results. Your resume uses only the equipment, hours, numbers and responsibilities you enter — it does not invent experience or numbers.",
  },
  resumeExample: {
    kicker: "/ ILLUSTRATIVE OPERATOR RESUME",
    heading: "HEAVY EQUIPMENT OPERATOR RESUME EXAMPLE",
    intro:
      "This fill-in example shows a clean structure for operators and trainees. Bracketed text is instructional, not a real person's work history or a promise of hiring.",
    name: "[Your name]",
    contact: "[City, State] · [Phone] · [Professional email]",
    targetTitle: "HEAVY EQUIPMENT OPERATOR",
    sections: [
      {
        label: "Professional summary",
        body:
          "[Operator or trainee] with [verified years or training hours] working on [actual machine types] for [sitework, utility, grading or road projects]. Experienced in [verified tasks] and [verified safety procedures].",
      },
      {
        label: "Equipment and skills",
        items: [
          "Machines: [excavator / dozer / wheel loader / skid steer actually used]",
          "Operations: [grading / trenching / loading / compaction actually performed]",
          "Safety: [inspections / spotters / utility awareness / relevant training]",
        ],
      },
      {
        label: "Relevant experience",
        items: [
          "[Company] — [Job title] — [Dates]",
          "Operated [specific machine] on [actual project], completing [verified scope or amount].",
          "Coordinated with [ground crew / supervisor] to [documented work outcome].",
        ],
      },
      {
        label: "Training and credentials",
        items: [
          "[OSHA or NCCER credential, exactly as earned and dated]",
          "[Equipment training program with classroom and supervised field hours separated]",
          "[Other role-specific authorization or license, only if applicable]",
        ],
      },
    ],
    guidance: [
      {
        label: "Experienced operator",
        body:
          "Lead with machines, attachments, project types, relevant site-production numbers and the safety procedures you used in your actual role.",
      },
      {
        label: "New operator or trade-school graduate",
        body:
          "Separate school, simulator and supervised seat time from independent paid experience. Name assessed equipment skills and related labor experience honestly.",
      },
      {
        label: "Excavator or grading specialist",
        body:
          "Focus on trenching or grading scope and controls you used. Include project context and machine model where verified, not generic equipment lists.",
      },
    ],
    bulletTip:
      "Use shift logs, work orders, project records or supervisor-verified figures for quantities. If you cannot verify a number, describe the task and equipment without one.",
  },
  howItWorks: [
    {
      title: "Create a verified account",
      body:
        "Confirm your secure email link. Your guided intake saves to your account and keeps the preselected roadwork, paving, concrete and heavy equipment track.",
    },
    {
      title: "Tell us what equipment you have operated",
      body:
        "Add actual machines, attachments, sites, safety training, credentials, projects and the operator job you want. Distinguish training from employment.",
    },
    {
      title: "Preview your operator resume free",
      body:
        "Review the watermarked resume and matching language before payment. Correct any unsupported detail.",
    },
    {
      title: "Unlock once for $9.99",
      body:
        "Pay once for the clean PDF, editable DOCX and matching cover letter. Up to three AI-assisted correction runs within seven days; no subscription.",
    },
  ],
  ats: {
    heading: "CLEAR STRUCTURE, EQUIPMENT-SPECIFIC KEYWORDS",
    body: [
      "Use readable section headings for Summary, Skills, Experience, Training and Certifications. Put actual equipment types, the sitework you performed and any required credentials where recruiters can find them.",
      "If the job posting names an excavator model, grade control system or safety practice, include it only if you truly have that experience. The builder helps organize your facts; it does not add unverified qualifications.",
      "Applicant tracking systems vary. No resume can guarantee an ATS pass, interview or hiring outcome.",
    ],
  },
  faq: {
    kicker: "/ HEAVY EQUIPMENT RESUME FAQ",
    heading: "HEAVY EQUIPMENT OPERATOR RESUME QUESTIONS",
    items: [
      {
        question: "What should a heavy equipment operator resume include?",
        answer:
          "Include your target job title, equipment you can actually operate, project types, grading or excavation tasks, verified site results, safety practices and relevant training. Keep work history distinct from school practice.",
      },
      {
        question: "How do I write a heavy equipment operator resume with no experience?",
        answer:
          "Use verified school or apprenticeship training, assessed machine skills, supervised seat time, safety courses and transferable construction or labor work. Clearly label training rather than presenting it as paid operator hours.",
      },
      {
        question: "Which machines should I name on an equipment operator resume?",
        answer:
          "Name only the machines you have operated, such as excavators, dozers, loaders, graders, rollers or skid steers. Add make or model and attachments only when you know them and they are relevant to the target posting.",
      },
      {
        question: "Does a heavy equipment operator need a CDL?",
        answer:
          "A CDL is not universally required to operate heavy equipment on a jobsite. Driving commercial vehicles on public roads may trigger separate CDL rules. Confirm requirements for the specific employer, vehicle and jurisdiction.",
      },
      {
        question: "How can I quantify operator experience without making up numbers?",
        answer:
          "Use actual daily equipment logs, truckloads, yards moved, equipment hours, site acreage, production sheets or supervisor-confirmed measurements. If no reliable number exists, describe the machine, task and scope in plain language.",
      },
      {
        question: "Can this builder work for excavator or bulldozer operators?",
        answer:
          "Yes. The guided Roadwork, Paving, Concrete & Heavy Equipment track covers excavators, bulldozers, wheel loaders, graders, skid steers and related field work. Select only your actual equipment and experience.",
      },
      {
        question: "What do I get for $9.99?",
        answer:
          "You can preview your watermarked resume free. A one-time $9.99 payment unlocks the clean PDF and editable DOCX with a matching cover letter. Up to three AI-assisted correction runs are included within seven days; no subscription.",
      },
    ],
  },
  closingCta: {
    kicker: "/ READY FOR YOUR NEXT OPERATOR APPLICATION",
    heading: "SHOW THE MACHINES. SHOW THE WORK.",
    body:
      "Built around verified heavy equipment operation, sitework and safety practices. Build and preview free, then unlock your resume and matching cover letter for $9.99 once.",
    ctaLabel: "Build my heavy equipment resume",
    packageNote:
      "Matching cover letter, PDF + editable DOCX, and up to three AI-assisted correction runs within seven days.",
  },
};
