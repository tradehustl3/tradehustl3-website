import type { GeneratedResume } from "../../worker/resume-documents";

// Production-like uploaded resume: a dense four-job building-equipment mechanic
// whose header line reads "Title · Trade" and whose upload has no skills section.
// Every fact below is fictional.
export const FIXTURE_NAME = "Dana Whitfield";
export const FIXTURE_TARGET_TITLE = "Building Equipment Mechanic";
export const FIXTURE_TRADE = "HVAC & Refrigeration";
export const FIXTURE_CITY_STATE = "Portland, OR";
export const FIXTURE_PHONE = "(503) 555-0188";
export const FIXTURE_EMAIL = "dana.whitfield@example.com";
export const FIXTURE_COMPOSITE_IDENTITY = "Building Equipment Mechanic · HVAC";

export const FIXTURE_ROLES = [
  {
    employer: "Northgate Medical Center",
    jobTitle: "Building Equipment Mechanic",
    location: "Portland, OR",
    startDate: "Mar 2021",
    endDate: "Present",
    current: true,
    bullets: [
      "Diagnosed and repaired HVAC equipment including chillers, boilers, air handlers, and rooftop units across a 400,000 sq ft hospital campus.",
      "Performed scheduled preventive maintenance on pumps, fans, cooling towers, and building automation controls to keep patient areas within required temperature ranges.",
      "Troubleshot electrical faults in motors, contactors, VFDs, and control circuits using multimeters and schematics.",
      "Recovered, evacuated, and charged refrigerant on split systems and packaged units in line with EPA Section 608 requirements.",
      "Coordinated outside vendors and contractors for chiller overhauls, fire damper inspections, and elevator repairs.",
      "Trained and supervised two apprentice mechanics on safe lockout/tagout procedures and equipment rounds.",
      "Replaced pumps, motors, belts, bearings, and valves and returned critical air handlers to service during overnight shutdown windows.",
      "Maintained work order records, equipment histories, and compliance logs for Joint Commission environment-of-care inspections.",
    ],
  },
  {
    employer: "Cascade Mechanical Services",
    jobTitle: "HVAC Service Technician",
    location: "Beaverton, OR",
    startDate: "Jun 2017",
    endDate: "Feb 2021",
    bullets: [
      "Installed and started up rooftop units, split systems, heat pumps, and thermostats for commercial customers.",
      "Diagnosed heating and cooling failures, replaced compressors, condenser fan motors, and capacitors, and verified system operation.",
      "Responded to after-hours emergency no-heat and no-cooling calls on a rotating on-call schedule.",
      "Completed preventive maintenance agreements for office buildings, restaurants, and retail sites.",
      "Documented service work, parts used, and recommendations on digital work orders.",
      "Explained repair findings and equipment replacement options to building managers and property owners.",
    ],
  },
  {
    employer: "Riverside Apartment Communities",
    jobTitle: "Maintenance Technician",
    location: "Gresham, OR",
    startDate: "Aug 2014",
    endDate: "May 2017",
    bullets: [
      "Completed plumbing repairs in occupied buildings, including leaking fixtures, water heaters, and drain lines.",
      "Repaired appliances, doors, locks, drywall, and lighting during apartment turns and resident service requests.",
      "Replaced furnace filters, igniters, and thermostats and cleaned condenser coils during seasonal maintenance.",
      "Responded to after-hours maintenance emergencies including water leaks and loss of heat.",
      "Kept shop inventory, filters, and common repair parts stocked for three apartment buildings.",
    ],
  },
  {
    employer: "Lakeview Senior Living",
    jobTitle: "Maintenance Technician",
    location: "Vancouver, WA",
    startDate: "Jan 2011",
    endDate: "Jul 2014",
    bullets: [
      "Maintained building systems, common areas, and resident apartments for a 120-unit senior living community.",
      "Repaired plumbing fixtures, call-light wiring, lighting, and kitchen equipment to keep resident areas safe.",
      "Performed monthly generator, fire extinguisher, and emergency lighting checks and logged results for inspections.",
      "Painted, patched, and prepared apartments for new residents on tight move-in schedules.",
      "Worked with contractors on roof, flooring, and boiler repairs and escorted them through occupied areas.",
    ],
  },
];

export const FIXTURE_CERTIFICATIONS = [
  "EPA Section 608 Universal Certification",
  "OSHA 30-Hour General Industry",
  "Oregon Limited Maintenance Electrician License",
];

export const FIXTURE_EDUCATION = {
  credential: "HVAC/R Technology Certificate",
  institution: "Portland Community College",
  location: "Portland, OR",
};

export const FIXTURE_SUMMARY = "Building equipment mechanic with hospital, commercial HVAC service, and residential property experience maintaining chillers, boilers, rooftop units, and building electrical systems.";

export const FIXTURE_SOURCE_TEXT = `${FIXTURE_NAME}
${FIXTURE_COMPOSITE_IDENTITY}
${FIXTURE_CITY_STATE} | ${FIXTURE_PHONE} | ${FIXTURE_EMAIL}

PROFESSIONAL SUMMARY
${FIXTURE_SUMMARY}

CERTIFICATIONS
${FIXTURE_CERTIFICATIONS.join("\n")}

EXPERIENCE
${FIXTURE_ROLES.map((role) => `${role.jobTitle}
${role.employer} — ${role.location}
${role.startDate} - ${role.endDate}
${role.bullets.map((item) => `- ${item}`).join("\n")}`).join("\n\n")}

EDUCATION
${FIXTURE_EDUCATION.credential}
${FIXTURE_EDUCATION.institution} — ${FIXTURE_EDUCATION.location}
`;

export function fixtureUploadedIntake(): Record<string, unknown> {
  return {
    contact: { fullName: FIXTURE_NAME, email: FIXTURE_EMAIL, phone: FIXTURE_PHONE, cityState: FIXTURE_CITY_STATE },
    career: { summaryNotes: FIXTURE_SUMMARY },
    fieldValue: {
      certifications: FIXTURE_CERTIFICATIONS,
      // The upload had no skills section; the header line was echoed as a skill.
      technicalSkills: [FIXTURE_COMPOSITE_IDENTITY],
    },
    experience: FIXTURE_ROLES.map(({ bullets, ...role }) => ({ ...role, responsibilities: bullets.join("\n") })),
    education: `${FIXTURE_EDUCATION.credential}, ${FIXTURE_EDUCATION.institution}, ${FIXTURE_EDUCATION.location}`,
    sourceResumeText: FIXTURE_SOURCE_TEXT,
    targetJob: { title: FIXTURE_TARGET_TITLE, company: "", location: "" },
    trade: FIXTURE_TRADE,
    meta: { source: "upload", importedResume: true },
  };
}

// The model draft that reproduced the defect: the title/trade line is the only competency.
export function fixtureModelDraft(): GeneratedResume {
  return {
    basics: {
      fullName: FIXTURE_NAME,
      targetTitle: FIXTURE_TARGET_TITLE,
      location: FIXTURE_CITY_STATE,
      phone: FIXTURE_PHONE,
      email: FIXTURE_EMAIL,
    },
    summary: FIXTURE_SUMMARY,
    skills: [FIXTURE_COMPOSITE_IDENTITY],
    certifications: FIXTURE_CERTIFICATIONS.map((name) => ({ name })),
    experience: FIXTURE_ROLES.map((role) => ({
      jobTitle: role.jobTitle,
      employer: role.employer,
      location: role.location,
      startDate: role.startDate,
      endDate: role.endDate,
      bullets: [...role.bullets],
    })),
    education: [{ ...FIXTURE_EDUCATION }],
    additionalInformation: [],
  };
}
