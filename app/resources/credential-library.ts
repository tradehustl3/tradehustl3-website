import { TRADE_CAREER_FAMILIES } from "../resume-examples/trade-career-catalog";

/**
 * TRADE HUSTL3 Credential Library — the single source of truth for every
 * certification, license, training card, and qualification the Resource
 * Center publishes.
 *
 * Editorial rules (enforced in tests/resources-credential-library.test.ts):
 * - Every record cites at least one official source (the agency or issuing
 *   organization), and every published fact must be traceable to one of them.
 * - `lastVerified` is the date a person last checked the record against those
 *   sources. Re-check before changing any fact.
 * - Anything that could not be confirmed from an official source is either left
 *   out or listed in `openQuestions` — never filled in from memory.
 * - Costs appear only when the issuer itself publishes the amount.
 * - `resumeTip` is TRADE HUSTL3 career advice, not an official requirement, and
 *   the UI must label it that way.
 *
 * One record serves every trade that uses it (`tradeSlugs`), so a correction
 * here updates every trade pathway page at once.
 */

export type TradeFamilySlug = (typeof TRADE_CAREER_FAMILIES)[number]["slug"];

/** What the credential is. These are not interchangeable on a resume. */
export type CredentialKind =
  /** Earned by passing an exam from the issuing or an approved body. */
  | "certification"
  /** Issued by a state or agency; grants legal permission to do the work. */
  | "license"
  /** Proof a course was completed; explicitly not a certification. */
  | "training-card"
  /** Employer, medical, security, or program authorization. */
  | "qualification";

/** Who, if anyone, requires it. */
export type CredentialRequirement =
  /** A federal rule requires it for the covered work. */
  | "federal"
  /** States or localities set the requirement; rules vary by location. */
  | "state-or-local"
  /** Employers or job sites commonly ask for it; no general legal mandate. */
  | "employer-preferred";

export type CredentialSource = { label: string; url: string };

export type CredentialDetail = { label: string; text: string };

export type CredentialRecord = {
  slug: string;
  name: string;
  kind: CredentialKind;
  requirement: CredentialRequirement;
  issuer: string;
  summary: string;
  whoNeedsIt: string;
  /** Structured breakdown: types, classes, endorsements, levels. */
  details?: readonly CredentialDetail[];
  howToEarn: readonly string[];
  renewal: string;
  /** Only amounts the issuer publishes, with the source they came from. */
  cost?: { text: string; source: CredentialSource };
  /** Career advice (label it as such in the UI). */
  resumeTip: { write: string; avoid: string; why: string };
  tradeSlugs: readonly TradeFamilySlug[];
  officialUrl: string;
  sources: readonly CredentialSource[];
  /** ISO date (YYYY-MM-DD) a person last checked this record. */
  lastVerified: string;
  /** Facts deliberately left out until an official source confirms them. */
  openQuestions?: readonly string[];
};

const ALL_TRADES = TRADE_CAREER_FAMILIES.map((family) => family.slug) as readonly TradeFamilySlug[];

const VERIFIED_2026_10_21 = "2026-10-21";

export const CREDENTIAL_LIBRARY: readonly CredentialRecord[] = [
  {
    slug: "epa-608",
    name: "EPA Section 608 Technician Certification",
    kind: "certification",
    requirement: "federal",
    issuer: "U.S. EPA (tests given by EPA-approved certifying organizations)",
    summary:
      "The federal certification for technicians who maintain, service, repair, or dispose of stationary refrigeration and air-conditioning equipment that could release refrigerant.",
    whoNeedsIt:
      "Technicians who attach or detach hoses and gauges to measure pressure, add or remove refrigerant, or otherwise open the refrigerant circuit. Apprentices are exempt only while closely and continually supervised by a certified technician.",
    details: [
      { label: "Type I", text: "Small appliances: factory-manufactured, charged, and hermetically sealed with five pounds or less of refrigerant." },
      { label: "Type II", text: "High- or very high-pressure appliances, except small appliances and motor vehicle AC." },
      { label: "Type III", text: "Low-pressure appliances." },
      { label: "Universal", text: "All three types. Requires the Core section to be passed under closed-book, proctored conditions." },
    ],
    howToEarn: [
      "Choose the type that matches the equipment you work on.",
      "Pass the Core section plus each type section, given by an EPA-approved certifying organization.",
      "For Universal, take the Core test proctored — an open-book Core result does not count toward Universal.",
    ],
    renewal: "Does not expire. If you lose your card, contact the organization that certified you (its name is on the card).",
    resumeTip: {
      write: "EPA Section 608 Technician Certification — Universal",
      avoid: "EPA certified",
      why: "Name the exact type you hold. Employers can check it with the certifying organization.",
    },
    tradeSlugs: ["hvac-refrigeration", "facilities-property-apartment-maintenance", "industrial-warehouse-maintenance"],
    officialUrl: "https://www.epa.gov/section608/section-608-technician-certification-requirements",
    sources: [
      { label: "EPA — Section 608 Technician Certification Requirements", url: "https://www.epa.gov/section608/section-608-technician-certification-requirements" },
      { label: "EPA — Q&A for Section 608 Certified Technicians", url: "https://www.epa.gov/section608/epas-refrigerant-management-program-questions-and-answers-section-608-certified" },
      { label: "EPA — Refrigerant Sales Restriction Q&A", url: "https://www.epa.gov/section608/questions-and-answers-about-refrigerant-sales-restriction" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Typical test fees vary by certifying organization; EPA does not publish a price."],
  },
  {
    slug: "epa-609",
    name: "EPA Section 609 MVAC Technician Certification",
    kind: "certification",
    requirement: "federal",
    issuer: "U.S. EPA (through EPA-approved training and certification programs)",
    summary: "The federal certification for servicing motor vehicle air-conditioning (MVAC) systems. It is separate from Section 608.",
    whoNeedsIt:
      "Anyone who repairs or services a motor vehicle AC system for payment or bartering. Technicians on MVAC-like equipment (such as farm and non-road equipment) may use Section 609 or Section 608 Type II; EPA recommends Section 609.",
    howToEarn: [
      "Complete training through an EPA-approved Section 609 program (EPA's list includes ASE, ESCO Institute, and Universal Technical Institute).",
      "Pass that program's test.",
    ],
    renewal: "EPA's program page does not list an expiration. Confirm with your training program.",
    resumeTip: {
      write: "EPA Section 609 MVAC Certification (ASE)",
      avoid: "EPA 608/609 certified",
      why: "608 and 609 are different certifications. List only the ones you hold, with the program that issued each.",
    },
    tradeSlugs: ["automotive-diesel-fleet-maintenance"],
    officialUrl: "https://www.epa.gov/mvac/section-609-technician-training-and-certification-programs",
    sources: [
      { label: "EPA — Section 609 Technician Training and Certification Programs", url: "https://www.epa.gov/mvac/section-609-technician-training-and-certification-programs" },
      { label: "EPA — Section 608 and Section 609 Overlap", url: "https://www.epa.gov/section608/section-608-and-section-609-overlap" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Confirm on an EPA source whether Section 609 certification expires before stating it."],
  },
  {
    slug: "osha-outreach-10-30",
    name: "OSHA 10-Hour and 30-Hour Outreach Training",
    kind: "training-card",
    requirement: "employer-preferred",
    issuer: "OSHA Outreach Training Program (taught by OSHA-authorized trainers)",
    summary:
      "A safety orientation that ends with a Department of Labor course-completion card. OSHA states the card is not a certification or license.",
    whoNeedsIt:
      "OSHA describes Outreach training as voluntary, and it does not replace the hazard training your employer must provide. Employers, projects, or local rules may still require it — check before you apply.",
    details: [
      { label: "Construction", text: "10-hour or 30-hour." },
      { label: "General Industry", text: "10-hour or 30-hour." },
      { label: "Maritime", text: "10-hour or 30-hour." },
      { label: "Disaster Site Worker", text: "15-hour." },
    ],
    howToEarn: [
      "Take the class from an OSHA-authorized trainer, or an OSHA-accepted online provider.",
      "Receive your card from the trainer. OSHA does not issue or verify individual student cards.",
    ],
    renewal:
      "Cards have no expiration date. For a replacement, contact your trainer — the class must be within the last five years, and only one replacement is allowed per class.",
    resumeTip: {
      write: "OSHA 30-Hour Construction Outreach Training (DOL card)",
      avoid: "OSHA certified",
      why: "OSHA says its card is not a certification. Listing the hours and industry is accurate and still shows employers what they're looking for.",
    },
    tradeSlugs: ALL_TRADES,
    officialUrl: "https://www.osha.gov/training/outreach",
    sources: [
      { label: "OSHA — Outreach Training Program FAQs", url: "https://www.osha.gov/training/outreach/faq" },
      { label: "OSHA — Outreach Training Program", url: "https://www.osha.gov/training/outreach" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Class prices are set by trainers and online providers; OSHA does not publish one."],
  },
  {
    slug: "forklift-operator",
    name: "Forklift (Powered Industrial Truck) Operator Training",
    kind: "qualification",
    requirement: "federal",
    issuer: "Your employer, under OSHA 29 CFR 1910.178(l)",
    summary:
      "OSHA requires employers to make sure every forklift operator is trained and evaluated before operating. The employer — not an outside agency — certifies it.",
    whoNeedsIt: "Anyone who operates a forklift or other powered industrial truck at work.",
    howToEarn: [
      "Formal instruction (classroom, video, or online).",
      "Practical training — demonstrations by the trainer and exercises by you.",
      "An evaluation of your driving in the workplace.",
      "Your employer certifies it with your name, the training and evaluation dates, and who trained and evaluated you.",
    ],
    renewal:
      "Your performance must be evaluated at least once every three years. Refresher training is also required after unsafe operation, an accident or near-miss, a failed evaluation, a different type of truck, or a workplace change.",
    resumeTip: {
      write: "Forklift operator — trained and evaluated (sit-down counterbalance, reach truck)",
      avoid: "Forklift license",
      why: "There is no government forklift license. Name the truck types you're trained on; a new employer will evaluate you again on their equipment.",
    },
    tradeSlugs: [
      "warehouse-logistics-material-handling",
      "industrial-warehouse-maintenance",
      "general-labor-trade-helpers",
      "construction-carpentry",
    ],
    officialUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.178",
    sources: [{ label: "OSHA — 29 CFR 1910.178 Powered industrial trucks", url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.178" }],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "lockout-tagout",
    name: "Lockout/Tagout (LOTO) Training",
    kind: "qualification",
    requirement: "federal",
    issuer: "Your employer, under OSHA 29 CFR 1910.147",
    summary: "Training on controlling hazardous energy so machines can't start up or release energy while you service them.",
    whoNeedsIt: "Authorized and affected employees who service or work around machinery and equipment covered by the standard.",
    howToEarn: [
      "Complete your employer's energy-control training.",
      "Your employer certifies the training with each employee's name and the training dates.",
    ],
    renewal:
      "Annual training is not required. Retraining is required when your job assignment changes, equipment or processes change, procedures change, or inspections show gaps in how the procedure is followed.",
    resumeTip: {
      write: "Lockout/Tagout (LOTO) authorized employee — 29 CFR 1910.147",
      avoid: "LOTO certified",
      why: "It's employer training, not a certification. Saying you're an authorized employee is accurate and specific.",
    },
    tradeSlugs: ["industrial-warehouse-maintenance", "facilities-property-apartment-maintenance", "electrical-low-voltage"],
    officialUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147",
    sources: [
      { label: "OSHA — Lockout/Tagout eTool: Employee Retraining", url: "https://www.osha.gov/etools/lockout-tagout/tutorial/employee-retraining" },
      { label: "OSHA — 29 CFR 1910.147", url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147" },
    ],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "cdl",
    name: "Commercial Driver's License (CDL)",
    kind: "license",
    requirement: "state-or-local",
    issuer: "Your state licensing agency, under federal FMCSA standards",
    summary: "The license required to drive commercial motor vehicles. States issue CDLs by class, with endorsements for specific vehicles and cargo.",
    whoNeedsIt: "Drivers of vehicles that meet the Class A, B, or C definitions below.",
    details: [
      { label: "Class A", text: "Combination vehicles of 26,001 lbs or more, towing a unit over 10,000 lbs." },
      { label: "Class B", text: "A single vehicle of 26,001 lbs or more, or one towing a unit of 10,000 lbs or less." },
      { label: "Class C", text: "Vehicles that aren't Class A or B but carry 16 or more people (including the driver) or placarded hazardous materials." },
      { label: "Endorsements", text: "T doubles/triples · P passenger · N tank · H hazardous materials · X tank + hazmat · S school bus." },
      { label: "Air brakes", text: "Drivers who don't meet air-brake requirements get an L or Z restriction on the license." },
    ],
    howToEarn: [
      "Get a commercial learner's permit from your state.",
      "First-time Class A or B, a B-to-A upgrade, or a first-time P, S, or H endorsement requires Entry-Level Driver Training (ELDT), recorded in FMCSA's Training Provider Registry.",
      "Pass your state's knowledge and skills tests.",
      "Meet the DOT medical requirements for the kind of driving you will do.",
    ],
    renewal: "Renewal periods are set by your state.",
    resumeTip: {
      write: "CDL Class A — Endorsements: N, T · No air-brake restriction",
      avoid: "CDL (all endorsements)",
      why: "List your exact class, endorsements, and restrictions. Employers pull your driving record and will see them anyway.",
    },
    tradeSlugs: [
      "commercial-driving-transportation",
      "roadwork-paving-concrete-heavy-equipment",
      "landscaping-grounds-maintenance",
      "automotive-diesel-fleet-maintenance",
      "general-labor-trade-helpers",
    ],
    officialUrl: "https://www.fmcsa.dot.gov/registration/commercial-drivers-license/drivers",
    sources: [
      { label: "FMCSA — CDL classes, endorsements, and restrictions", url: "https://www.fmcsa.dot.gov/registration/commercial-drivers-license/drivers" },
      { label: "FMCSA — Entry-Level Driver Training (ELDT)", url: "https://www.fmcsa.dot.gov/registration/commercial-drivers-license/entry-level-driver-training-eldt" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["State testing fees and renewal periods vary; link each state's agency before listing amounts."],
  },
  {
    slug: "dot-medical-card",
    name: "DOT Medical Examiner's Certificate",
    kind: "qualification",
    requirement: "federal",
    issuer: "A certified medical examiner on FMCSA's National Registry",
    summary: "Proof you are physically qualified to drive a commercial motor vehicle.",
    whoNeedsIt: "Commercial motor vehicle drivers covered by FMCSA's medical rules.",
    howToEarn: ["Pass a DOT physical with a medical examiner listed on the FMCSA National Registry."],
    renewal: "Valid for up to 24 months. The examiner can issue it for a shorter period, for example to monitor a condition.",
    resumeTip: {
      write: "Current DOT medical card",
      avoid: "Listing health details",
      why: "Saying it's current is enough. Never put medical information on a resume.",
    },
    tradeSlugs: ["commercial-driving-transportation"],
    officialUrl: "https://www.fmcsa.dot.gov/medical/driver-medical-requirements/dot-medical-exam-and-commercial-motor-vehicle-certification",
    sources: [
      { label: "FMCSA — DOT Medical Exam and CMV Certification", url: "https://www.fmcsa.dot.gov/medical/driver-medical-requirements/dot-medical-exam-and-commercial-motor-vehicle-certification" },
    ],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "hazmat-endorsement",
    name: "Hazardous Materials Endorsement (HME)",
    kind: "license",
    requirement: "federal",
    issuer: "Your state, after a TSA security threat assessment",
    summary: "The CDL endorsement (H, or X with tank) for hauling placarded hazardous materials.",
    whoNeedsIt: "CDL holders who transport materials that require placarding.",
    howToEarn: [
      "Pass the hazmat knowledge test; first-time H endorsements also require Entry-Level Driver Training.",
      "Complete TSA's security threat assessment. TSA notifies your state, and the state adds the endorsement.",
    ],
    renewal: "Generally every five years; some states review more often.",
    cost: {
      text: "TSA threat assessment: $86.50 for new applicants; $41.00 reduced rate for valid TWIC holders in states that accept it.",
      source: { label: "TSA — HAZMAT Endorsement", url: "https://www.tsa.gov/for-industry/hazmat-endorsement" },
    },
    resumeTip: {
      write: "CDL Class A with Hazmat (H) endorsement",
      avoid: "Hazmat certified",
      why: "It's an endorsement on your CDL. Say it that way.",
    },
    tradeSlugs: ["commercial-driving-transportation"],
    officialUrl: "https://www.tsa.gov/for-industry/hazmat-endorsement",
    sources: [
      { label: "TSA — HAZMAT Endorsement", url: "https://www.tsa.gov/for-industry/hazmat-endorsement" },
      { label: "FMCSA — Entry-Level Driver Training (ELDT)", url: "https://www.fmcsa.dot.gov/registration/commercial-drivers-license/entry-level-driver-training-eldt" },
    ],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "twic",
    name: "Transportation Worker Identification Credential (TWIC)",
    kind: "qualification",
    requirement: "federal",
    issuer: "TSA",
    summary: "A federal security credential for workers who need access to secure areas of regulated maritime facilities and vessels.",
    whoNeedsIt: "Workers who need access to secure areas of regulated maritime facilities and vessels.",
    howToEarn: ["Enroll in person at a TSA enrollment center (schedule online or by phone).", "Pass TSA's security threat assessment."],
    renewal: "Valid for five years. Eligible holders can renew online up to one year before expiration.",
    cost: {
      text: "Replacement card: $60.",
      source: { label: "TSA — TWIC FAQ", url: "https://www.tsa.gov/for-industry/twic_faq" },
    },
    resumeTip: { write: "TWIC card (valid through 2029)", avoid: "TWIC certified", why: "It's an ID credential. The expiration year tells employers it's current." },
    tradeSlugs: ["commercial-driving-transportation", "warehouse-logistics-material-handling"],
    officialUrl: "https://www.tsa.gov/twic",
    sources: [{ label: "TSA — TWIC FAQ", url: "https://www.tsa.gov/for-industry/twic_faq" }],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Confirm the current enrollment and online-renewal fees on a TSA page before publishing them."],
  },
  {
    slug: "nate",
    name: "NATE Certification",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "North American Technician Excellence (NATE)",
    summary: "A voluntary HVACR certification many employers use to gauge a technician's knowledge. NATE offers two pathways: Core plus a Specialty exam, or the five-exam CHP-5 pathway.",
    whoNeedsIt: "HVACR technicians who want to show knowledge beyond the federal minimum. Not legally required.",
    howToEarn: [
      "Traditional pathway: pass the NATE Core exam and a Specialty exam.",
      "CHP-5 pathway: pass five exams — HVAC Fundamentals, Electrical and Controls, Comfort and Airflow, Installation, and Service.",
    ],
    renewal:
      "Renew every two years: complete 16 continuing education hours and pay the renewal fee, or retake the specialty exam. If you miss the grace period, you must retake both Core and specialty.",
    cost: {
      text: "Specialty renewal: $25 for one specialty; when renewing several, $5 for each additional specialty.",
      source: { label: "NATE — Recertification FAQs", url: "https://natex.org/technician/recertification-faqs" },
    },
    resumeTip: {
      write: "NATE Certified — [specialty] (exp. [year])",
      avoid: "NATE certified (all)",
      why: "List each specialty you hold. NATE certifications expire, so include the date.",
    },
    tradeSlugs: ["hvac-refrigeration", "facilities-property-apartment-maintenance"],
    officialUrl: "https://natex.org/",
    sources: [
      { label: "NATE — Getting Started (certification pathways)", url: "https://natex.org/technician/become-nate-certified/getting-started-2" },
      { label: "NATE — Recertification FAQs", url: "https://natex.org/technician/recertification-faqs" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: [
      "Initial exam fees: confirm on NATE's Policies and Fees page before publishing.",
      "NATE's recertification FAQ describes specialty renewal; confirm how CHP-5 holders recertify before stating it.",
    ],
  },
  {
    slug: "ase",
    name: "ASE Certification",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "National Institute for Automotive Service Excellence (ASE)",
    summary: "Voluntary certification by test series — automobile (A), medium-heavy truck (T), collision (B), and others.",
    whoNeedsIt: "Automotive, diesel, and fleet technicians. Not legally required, but widely requested.",
    details: [
      { label: "Entry-Level", text: "No work experience required. Valid for two years and not renewable." },
      { label: "Professional", text: "Pass a test and document the required work experience." },
    ],
    howToEarn: ["Pass the test for each area.", "For professional-level certification, submit proof of work experience."],
    renewal: "Professional certifications must be renewed every five years.",
    resumeTip: {
      write: "ASE Certified — A4 Suspension & Steering, A5 Brakes",
      avoid: "ASE Master (unless you hold every required test)",
      why: "List each test area you've passed. Employers look for specific areas.",
    },
    tradeSlugs: ["automotive-diesel-fleet-maintenance"],
    officialUrl: "https://www.ase.com/",
    sources: [
      { label: "ASE — Certification Pathway", url: "https://ase.com/about/certification-pathway/" },
      { label: "ASE — Frequently Asked Questions", url: "https://ase.com/faqs/" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: [
      "Exact years of work experience and training substitutions: confirm on an ASE page.",
      "Master Technician requirements: confirm on an ASE page.",
    ],
  },
  {
    slug: "aws-certified-welder",
    name: "AWS Certified Welder",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "American Welding Society (tests at AWS Accredited Test Facilities)",
    summary: "A performance-based welding certification that travels with you from employer to employer.",
    whoNeedsIt: "Welders who want portable proof of their skills. No prerequisite courses or certifications.",
    howToEarn: ["Test at an AWS Accredited Test Facility.", "Pass the performance (weld) test for the process and position you're certifying in."],
    renewal: "Stays valid as long as continuity is maintained: AWS's FAQ says to submit maintenance documentation every six months confirming you still use the certified process. If continuity lapses, the certification can become inactive and you'd requalify by testing. AWS also lists an annual WeldCert Pro subscription as a program requirement.",
    resumeTip: {
      write: "AWS Certified Welder — GMAW, 3G/4G plate (AWS D1.1)",
      avoid: "Certified welder, all positions",
      why: "Name the process, position, and code you tested to. That's what the shop will ask.",
    },
    tradeSlugs: ["welding-fabrication-machining"],
    officialUrl: "https://www.aws.org/certification-and-education/professional-certification/certified-welder-program/",
    sources: [{ label: "AWS — Certified Welder Program", url: "https://www.aws.org/certification-and-education/professional-certification/certified-welder-program/" }],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["WeldCert Pro subscription price: AWS points to a separate price list; confirm before publishing an amount."],
  },
  {
    slug: "aws-cwi",
    name: "AWS Certified Welding Inspector (CWI)",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "American Welding Society",
    summary: "A certification for welding inspectors, earned with qualifying education and experience plus three exams.",
    whoNeedsIt: "Experienced welders and QA/QC professionals moving into inspection.",
    howToEarn: ["Document a qualifying combination of education and work experience.", "Pass a vision test.", "Pass all three exams: Parts A, B, and C."],
    renewal: "A nine-year certification period, with renewal applications at years three and six, then recertification at year nine.",
    resumeTip: {
      write: "AWS Certified Welding Inspector (CWI), cert. no. on request",
      avoid: "Welding inspector certified",
      why: "Use the exact credential name. Employers verify CWIs with AWS.",
    },
    tradeSlugs: ["welding-fabrication-machining"],
    officialUrl: "https://www.aws.org/certification-and-education/professional-certification/certified-welding-inspector/",
    sources: [{ label: "AWS — Certified Welding Inspector", url: "https://www.aws.org/certification-and-education/professional-certification/certified-welding-inspector/" }],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Exact education/experience combinations: confirm in AWS QC1 before listing them."],
  },
  {
    slug: "cpo",
    name: "Certified Pool & Spa Operator (CPO)",
    kind: "certification",
    requirement: "state-or-local",
    issuer: "Pool & Hot Tub Alliance (PHTA)",
    summary: "Certification for maintaining and operating pools and spas safely — common for apartment, hotel, and facility maintenance.",
    whoNeedsIt: "Maintenance staff responsible for pools. Some states and localities require it — check your health department.",
    howToEarn: ["Complete the 16-hour CPO course (two days in person, or blended online plus one day in person).", "Pass the CPO exam."],
    renewal: "Valid for five years.",
    resumeTip: { write: "Certified Pool & Spa Operator (CPO), PHTA — exp. 2030", avoid: "Pool certified", why: "Use the full name and expiration year." },
    tradeSlugs: ["facilities-property-apartment-maintenance"],
    officialUrl: "https://www.phta.org/education-certification/certification/phta-certified-pool-service-professional-pathway/certified-pool-spa-operator-cpo/",
    sources: [
      { label: "PHTA — Certified Pool & Spa Operator", url: "https://www.phta.org/education-certification/certification/phta-certified-pool-service-professional-pathway/certified-pool-spa-operator-cpo/" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Which states require CPO: use PHTA's requirement map before naming any state."],
  },
  {
    slug: "camt",
    name: "Certificate for Apartment Maintenance Technicians (CAMT)",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "National Apartment Association Education Institute",
    summary: "An ANAB-accredited credential for apartment and rental-housing maintenance technicians.",
    whoNeedsIt: "Apartment and property maintenance technicians. CAMT is separate from EPA 608 — refrigerant work still requires 608.",
    howToEarn: [
      "Have at least 12 months of apartment or rental housing maintenance experience (or earn a Provisional CAMT and meet it within two years).",
      "Complete all CAMT classroom and online coursework.",
      "Pass the exam.",
    ],
    renewal: "The full CAMT does not require renewal — NAA says it is good for life. A Provisional CAMT expires two years after it is earned unless you meet the experience requirement and upgrade; otherwise you retake the course and exam. NAA's former AIME program, which had annual renewal, was discontinued January 31, 2026.",
    resumeTip: { write: "Certificate for Apartment Maintenance Technicians (CAMT), NAAEI", avoid: "CAMT/EPA certified", why: "CAMT and EPA 608 are different credentials. List each one you hold on its own line." },
    tradeSlugs: ["facilities-property-apartment-maintenance"],
    officialUrl: "https://naahq.org/naaei/credentials/camt-accreditation",
    sources: [
      { label: "NAA — Renew Your Credential", url: "https://naahq.org/naaei/credentials/renew" },
      { label: "NAA — Certificate for Apartment Maintenance Technicians", url: "https://naahq.org/naaei/credentials/camt-accreditation" },
    ],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: ["Course fees are set by local NAA affiliates; confirm before publishing an amount."],
  },
  {
    slug: "isa-certified-arborist",
    name: "ISA Certified Arborist",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "International Society of Arboriculture (ISA)",
    summary: "A professional certification for tree care, earned with field experience and a written exam.",
    whoNeedsIt: "Tree-care and grounds professionals moving into arborist roles.",
    howToEarn: [
      "Have three years of full-time arboriculture experience, or a qualifying mix of degree or assessed training plus experience.",
      "Pass the exam: 200 multiple-choice questions in 3.5 hours.",
    ],
    renewal: "Valid for three years. One way to recertify is 30 continuing education units over the three years, plus the fee.",
    cost: {
      text: "Recertification by CEUs: $220.",
      source: { label: "ISA — Certified Arborist Program Guide (rev. August 2025)", url: "https://www.isa-arbor.com/portals/0/assets/pdf/certification-applications/cert-application-certified-arborist.pdf" },
    },
    resumeTip: { write: "ISA Certified Arborist, cert. #[number]", avoid: "Certified tree expert", why: "Use ISA's exact title; your certification number lets employers verify it." },
    tradeSlugs: ["landscaping-grounds-maintenance"],
    officialUrl: "https://www.isa-arbor.com/",
    sources: [
      { label: "ISA — Certified Arborist Program Guide (rev. August 2025)", url: "https://www.isa-arbor.com/portals/0/assets/pdf/certification-applications/cert-application-certified-arborist.pdf" },
    ],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "nccer",
    name: "NCCER Craft Credentials",
    kind: "certification",
    requirement: "employer-preferred",
    issuer: "NCCER",
    summary: "Two different things share the NCCER name: training credentials from completing NCCER craft training, and NCCER certification, which requires passing both a written assessment and a performance verification. Both can be verified through NCCER's digital wallet.",
    whoNeedsIt: "Craft workers in construction, maintenance, and industrial trades — often earned through training programs and schools.",
    howToEarn: [
      "Training credentials: complete NCCER craft training taught by NCCER-certified instructors (knowledge plus hands-on, performance-based testing).",
      "Certification: pass both a written assessment and a performance verification for the craft.",
    ],
    renewal: "NCCER's page does not state an expiration. Confirm with NCCER.",
    resumeTip: {
      write: "NCCER Carpentry Level 2 — training completed",
      avoid: "NCCER Certified (for training you completed)",
      why: "Completing a training level is not the same as NCCER certification. Write \"NCCER Certified — [craft]\" only if you passed the written assessment and performance verification.",
    },
    tradeSlugs: [
      "construction-carpentry",
      "electrical-low-voltage",
      "plumbing-pipefitting",
      "welding-fabrication-machining",
      "roadwork-paving-concrete-heavy-equipment",
    ],
    officialUrl: "https://www.nccer.org/credentials-certifications/industry-recognized-credentials/",
    sources: [{ label: "NCCER — Industry-Recognized Credentials", url: "https://www.nccer.org/credentials-certifications/industry-recognized-credentials/" }],
    lastVerified: VERIFIED_2026_10_21,
  },
  {
    slug: "state-trade-license",
    name: "State and Local Trade Licenses",
    kind: "license",
    requirement: "state-or-local",
    issuer: "Your state or local licensing board",
    summary:
      "Electrical, plumbing, mechanical/HVAC, roofing, and contractor licenses are set by states — and sometimes cities or counties. Levels, exams, and experience hours differ by location.",
    whoNeedsIt: "Depends on your state and the work. Many states license electricians, plumbers, and HVAC/mechanical contractors.",
    howToEarn: [
      "Look up your occupation and state in CareerOneStop's License Finder (U.S. Department of Labor).",
      "Confirm the requirements directly with the licensing board it lists.",
    ],
    renewal: "Set by each licensing board; many require continuing education.",
    resumeTip: {
      write: "[State] Journeyman Plumber License #[number] (exp. [year])",
      avoid: "Licensed (no state or number)",
      why: "Always include the state, level, and number. Licenses don't carry over between states automatically.",
    },
    tradeSlugs: [
      "hvac-refrigeration",
      "electrical-low-voltage",
      "plumbing-pipefitting",
      "construction-carpentry",
      "roofing-exterior-trades",
      "landscaping-grounds-maintenance",
    ],
    officialUrl: "https://www.careeronestop.org/Toolkit/Training/find-licenses-help.aspx",
    sources: [{ label: "CareerOneStop — License Finder", url: "https://www.careeronestop.org/Toolkit/Training/find-licenses-help.aspx" }],
    lastVerified: VERIFIED_2026_10_21,
    openQuestions: [
      "State-specific pages (starting with Georgia) need each licensing board's own source.",
      "Landscaping is mapped here for state pesticide applicator licenses; build a dedicated pesticide-applicator record once a state source is checked.",
    ],
  },
];

/**
 * Credentials named in the builder's chips or planned for the Resource Center
 * that have NOT been verified against an official source. Do not publish
 * guide pages for these until each is checked and moved into the library.
 */
export const PENDING_CREDENTIALS: readonly { name: string; reason: string }[] = [
  { name: "HVAC Excellence", reason: "Issuer site (now under ESCO Group) could not be reached for verification." },
  { name: "NFPA 70E electrical safety training", reason: "NFPA 70E is a safety standard, not a certification. Retraining intervals need a primary NFPA or OSHA source." },
  { name: "Backflow tester certification", reason: "Requirements are set by states and water authorities." },
  { name: "Medical gas installer (ASSE 6000 series)", reason: "Issuer details not yet checked." },
  { name: "State pesticide applicator license", reason: "State-by-state; needs each state's agriculture department." },
  { name: "CMRP (SMRP)", reason: "Issuer details not yet checked." },
  { name: "Ammonia refrigeration (RETA)", reason: "Issuer details not yet checked." },
  { name: "First aid / CPR", reason: "Validity varies by provider (Red Cross, AHA); check each." },
  { name: "Scaffold, aerial lift, fall protection, silica, trenching competent person, crane signalperson", reason: "OSHA training and designation rules; each standard needs checking." },
  { name: "Flagger / traffic control", reason: "Set by state DOTs." },
  { name: "Manufacturer and NRCA roofing training", reason: "Program-specific; not yet checked." },
];

/**
 * Who checked the library as a tradesperson, in addition to the source check.
 * Approved by Zachary Ellis on 2026-10-21 to appear on credential guides.
 */
export const CREDENTIAL_REVIEW = {
  reviewer: "Zachary Ellis",
  role: "Founder of TRADE HUSTL3 · HVAC and facilities maintenance professional",
  reviewedOn: "2026-10-21",
} as const;

export const CREDENTIAL_KIND_LABELS: Record<CredentialKind, string> = {
  certification: "Certification",
  license: "License",
  "training-card": "Training card",
  qualification: "Qualification",
};

export const CREDENTIAL_KIND_DESCRIPTIONS: Record<CredentialKind, string> = {
  certification: "Earned by passing an exam from the issuer or an approved body.",
  license: "Issued by a state or agency. Rules vary by location.",
  "training-card": "Proof you completed a course. Not a certification.",
  qualification: "Employer, medical, or security authorization.",
};

export const CREDENTIAL_REQUIREMENT_LABELS: Record<CredentialRequirement, string> = {
  federal: "Federal rule",
  "state-or-local": "State / local",
  "employer-preferred": "Employer-preferred",
};

export type CredentialMyth = {
  id: string;
  claim: string;
  isTrue: boolean;
  fact: string;
  /** Library record whose sources back this fact. */
  credentialSlug: string;
};

/**
 * True/false checks for the homepage "Jobsite Myth Check". Every fact must be
 * stated in the linked credential record (tests enforce the link exists).
 */
export const CREDENTIAL_MYTHS: readonly CredentialMyth[] = [
  {
    id: "osha-10-certification",
    claim: "OSHA 10 is a certification.",
    isTrue: false,
    fact: "It's a course-completion card from OSHA's Outreach program. OSHA says the card is not a certification or license — on a resume, write “OSHA 10-Hour Outreach Training.”",
    credentialSlug: "osha-outreach-10-30",
  },
  {
    id: "epa-608-expires",
    claim: "EPA 608 certification expires.",
    isTrue: false,
    fact: "Section 608 certification does not expire. Lost your card? Contact the organization named on it.",
    credentialSlug: "epa-608",
  },
  {
    id: "forklift-license",
    claim: "You can get a government forklift license.",
    isTrue: false,
    fact: "OSHA puts it on your employer: they train you, evaluate you on the job, and certify it — and re-evaluate you at least every three years.",
    credentialSlug: "forklift-operator",
  },
  {
    id: "dot-medical-24-months",
    claim: "A DOT medical card can be good for up to 24 months.",
    isTrue: true,
    fact: "Up to 24 months — and the examiner can issue it for less, for example to monitor a condition.",
    credentialSlug: "dot-medical-card",
  },
];

/**
 * The one credential each trade card features as its "key credential" image.
 * It must be a library record mapped to that trade. "Key" is TRADE HUSTL3's
 * editorial pick of the most common entry credential — the badge shows the
 * record's own requirement label, so nothing is presented as required unless
 * the record says a federal rule requires it.
 */
export const TRADE_KEY_CREDENTIALS: Record<TradeFamilySlug, { credentialSlug: string; badgeLabel: string }> = {
  "hvac-refrigeration": { credentialSlug: "epa-608", badgeLabel: "EPA 608" },
  "electrical-low-voltage": { credentialSlug: "state-trade-license", badgeLabel: "State electrical license" },
  "plumbing-pipefitting": { credentialSlug: "state-trade-license", badgeLabel: "State plumbing license" },
  "construction-carpentry": { credentialSlug: "osha-outreach-10-30", badgeLabel: "OSHA 10 / 30" },
  "facilities-property-apartment-maintenance": { credentialSlug: "epa-608", badgeLabel: "EPA 608" },
  "welding-fabrication-machining": { credentialSlug: "aws-certified-welder", badgeLabel: "AWS Certified Welder" },
  "general-labor-trade-helpers": { credentialSlug: "osha-outreach-10-30", badgeLabel: "OSHA 10" },
  "commercial-driving-transportation": { credentialSlug: "cdl", badgeLabel: "CDL Class A / B" },
  "warehouse-logistics-material-handling": { credentialSlug: "forklift-operator", badgeLabel: "Forklift operator" },
  "industrial-warehouse-maintenance": { credentialSlug: "lockout-tagout", badgeLabel: "Lockout / Tagout" },
  "landscaping-grounds-maintenance": { credentialSlug: "isa-certified-arborist", badgeLabel: "ISA Certified Arborist" },
  "roadwork-paving-concrete-heavy-equipment": { credentialSlug: "cdl", badgeLabel: "CDL Class A / B" },
  "roofing-exterior-trades": { credentialSlug: "osha-outreach-10-30", badgeLabel: "OSHA 10 / 30" },
  "automotive-diesel-fleet-maintenance": { credentialSlug: "ase", badgeLabel: "ASE Certified" },
};

export function credentialsForTrade(slug: TradeFamilySlug): readonly CredentialRecord[] {
  return CREDENTIAL_LIBRARY.filter((credential) => credential.tradeSlugs.includes(slug));
}

export function credentialBySlug(slug: string): CredentialRecord | undefined {
  return CREDENTIAL_LIBRARY.find((credential) => credential.slug === slug);
}
