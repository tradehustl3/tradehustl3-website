export type HubStep = { title: string; sub: string; href: string };
export type HubStage = { id: string; label: string; headline: string; copy: string; steps: readonly HubStep[] };

/**
 * "Where are you in your trade?" — routes each kind of visitor to pages that
 * exist today. Only live URLs belong here; add a step when its page ships.
 */
export const HUB_STAGES: readonly HubStage[] = [
  {
    id: "exploring",
    label: "Exploring a trade",
    headline: "Find the trade that fits you",
    copy: "Compare 14 trade families: what the work is, the job titles inside each one, and the credentials that go with it.",
    steps: [
      { title: "Explore the trades", sub: "14 families, 207 job titles", href: "/resume-examples" },
      { title: "See what each trade requires", sub: "Credentials by trade", href: "/resources/certifications#trade-hvac-refrigeration" },
      { title: "Get the Top 10 Trades guide", sub: "Free download", href: "/top-10-trades" },
    ],
  },
  {
    id: "training",
    label: "In school or training",
    headline: "Finish ready to get hired",
    copy: "Know which credentials your trade asks for, see real trade resume examples, and leave with a resume you can send.",
    steps: [
      { title: "Check your credentials", sub: "Required vs. employer-preferred", href: "/resources/certifications" },
      { title: "See trade resume examples", sub: "Seven detailed examples", href: "/resume-examples/skilled-trades" },
      { title: "Build your resume", sub: "Free preview", href: "#resume-start" },
    ],
  },
  {
    id: "working",
    label: "Working in the trade",
    headline: "Get to the next job",
    copy: "Add the credential that opens doors, then show your real experience on a resume built for your trade.",
    steps: [
      { title: "Add a credential", sub: "Sourced, step-by-step guides", href: "/resources/certifications" },
      { title: "Find your job title", sub: "207 mapped titles", href: "/resume-examples" },
      { title: "Update your resume", sub: "Free preview · $9.99 to unlock", href: "#resume-start" },
    ],
  },
  {
    id: "leading",
    label: "Moving into leadership",
    headline: "Step up to lead or supervisor",
    copy: "Show crew, safety, and work-order experience the way maintenance and facilities managers look for it.",
    steps: [
      { title: "Maintenance resume tips", sub: "What managers look for", href: "/resume-examples/maintenance-resume-tips" },
      { title: "Credentials that carry weight", sub: "By trade", href: "/resources/certifications" },
      { title: "Build a lead-level resume", sub: "Free preview", href: "#resume-start" },
    ],
  },
  {
    id: "organizations",
    label: "School, program, or employer",
    headline: "Help your people get hired",
    copy: "Every guide is free for your students, apprentices, and new hires. For group access or partnerships, talk to us.",
    steps: [
      { title: "Share the Resource Center", sub: "Free for everyone", href: "/resources" },
      { title: "Share the credential library", sub: "Sourced and dated", href: "/resources/certifications" },
      { title: "Contact TRADE HUSTL3", sub: "Partnerships and group access", href: "/contact" },
    ],
  },
];
