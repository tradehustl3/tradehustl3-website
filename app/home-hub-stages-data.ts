import { CATALOG_METRICS } from "./resume-examples/catalog-metrics";

export type HubStep = { title: string; sub: string; href: string };
export type HubStageIcon = "student" | "new" | "working" | "leading" | "changer";
export type HubStage = {
  id: string;
  label: string;
  sublabel: string;
  icon: HubStageIcon;
  headline: string;
  copy: string;
  steps: readonly HubStep[];
};

const FAMILIES = CATALOG_METRICS.careerFamilies;
const ROLES = CATALOG_METRICS.mappedRoles;

/**
 * "Where are you in your trade?" — routes each kind of visitor to pages that
 * exist today. Only live URLs belong here; add a step when its page ships.
 * Counts come from the resume-example catalog so they cannot drift.
 * No income claims and no promises of employment: every step is something the
 * visitor can do on the site right now.
 *
 * This module imports the full trade catalog, so only server components may
 * import it. The client picker receives these values as props.
 */
export const HUB_STAGES: readonly HubStage[] = [
  {
    id: "student",
    label: "Student",
    sublabel: "Exploring a career",
    icon: "student",
    headline: "Find the trade that fits you",
    copy: `Compare ${FAMILIES} trade families: what the work is, the job titles inside each one, and the credentials that go with it.`,
    steps: [
      { title: "Explore the trades", sub: `${FAMILIES} families, ${ROLES} job titles`, href: "/resume-examples" },
      { title: "See what each trade requires", sub: "Credentials by trade", href: "/resources/certifications#trade-hvac-refrigeration" },
      { title: "Get the Top 10 Trades guide", sub: "Free download", href: "/top-10-trades" },
    ],
  },
  {
    id: "new",
    label: "New to Trades",
    sublabel: "Get started",
    icon: "new",
    headline: "Get ready for your first trade job",
    copy: "Learn which credentials your trade asks for, see real trade resume examples, and put together a resume you can send.",
    steps: [
      { title: "Check your credentials", sub: "Required vs. employer-preferred", href: "/resources/certifications" },
      { title: "See trade resume examples", sub: "Seven detailed examples", href: "/resume-examples/skilled-trades" },
      { title: "Build your resume", sub: "Free preview", href: "#resume-start" },
    ],
  },
  {
    id: "working",
    label: "In the Trade",
    sublabel: "Build skills",
    icon: "working",
    headline: "Build on the work you already do",
    copy: "Add a credential that fits your next move, then show your real experience on a resume built for your trade.",
    steps: [
      { title: "Add a credential", sub: "Sourced, step-by-step guides", href: "/resources/certifications" },
      { title: "Find your job title", sub: `${ROLES} mapped titles`, href: "/resume-examples" },
      { title: "Update your resume", sub: "Free preview · $9.99 to unlock", href: "#resume-start" },
    ],
  },
  {
    id: "leading",
    label: "Supervisor / Lead",
    sublabel: "Take the next step",
    icon: "leading",
    headline: "Step up to lead or supervisor",
    copy: "Show crew, safety, and work-order experience the way maintenance and facilities managers look for it.",
    steps: [
      { title: "Maintenance resume tips", sub: "What managers look for", href: "/resume-examples/maintenance-resume-tips" },
      { title: "Credentials that carry weight", sub: "By trade", href: "/resources/certifications" },
      { title: "Build a lead-level resume", sub: "Free preview", href: "#resume-start" },
    ],
  },
  {
    id: "changer",
    label: "Career Changer",
    sublabel: "Start a new path",
    icon: "changer",
    headline: "Bring your experience into the trades",
    copy: "Your past work still counts. Compare trades, see what training each one takes, and show your transferable experience honestly.",
    steps: [
      { title: "Compare the trades", sub: `${FAMILIES} families, ${ROLES} job titles`, href: "/resume-examples" },
      { title: "See what training it takes", sub: "Credentials by trade", href: "/resources/certifications" },
      { title: "Build your resume", sub: "Free preview", href: "#resume-start" },
    ],
  },
];

/** Schools, programs, and employers keep a direct path below the persona band. */
export const HUB_ORGANIZATION_LINK = {
  lead: "School, program, or employer?",
  title: "Talk to us about group access",
  href: "/contact",
} as const;
