# Resume Builder — Phase 2 Spec

## Competencies and pagination (branch `fix/resume-skills-pagination`)

### Approved behavior

1. The resume visual direction in current production output is approved. Fonts, colors, section order, and
   the three templates (plain / navy / lead) do not change.
2. The competency section holds competencies only — never contact information, standalone job titles, the
   target title, or trade labels.
3. Composite identity/title strings (for example `Building Equipment Mechanic · HVAC`) are filtered.
4. Competencies stay source-grounded: every label is backed by a verified upload or intake fact.
5. Pagination prioritizes readability and balanced page use.
6. A job heading, its employer line, and its first bullet always stay together.
7. The remaining bullets of a job may flow to the next page.
8. Verified experience is never deleted to reach one page.
9. One page is preferred only when the content genuinely fits; two pages are valid for substantial experience.

Competency headings by template (unchanged):

| Template | Heading |
| --- | --- |
| plain | CORE SKILLS |
| navy | AREAS OF EXPERTISE |
| lead | LEADERSHIP & OPERATIONS COMPETENCIES |

The target title renders directly under the candidate name. Contact information renders only in the header.

### Production defects addressed

- **Skills:** a production resume rendered `CORE SKILLS — BUILDING EQUIPMENT MECHANIC · HVAC`. The upload
  had no skills section, and the model returned the header line as the only skill. `isResumeIdentityTerm`
  compared only the whole normalized string against the target title and trade, so the composite survived.
  `skillSupported` then accepted it because the header line is in `sourceResumeText`. The verified-source
  recovery path produced the same single item, because its skills come only from the source skill lists.
- **Pagination:** page 1 was full and page 2 held only the complete final job. The PDF writer called
  `ensureSpace(fullJobHeight)` for every job after the first, so a later job moved to a new page as a whole
  whenever all of its bullets did not fit. The DOCX writer set `keepNext` on every bullet except the last,
  which chained each job into one unbreakable block with the same effect in Word.

### Implementation requirements

Competencies (`worker/resume-quality.ts`):

- `competencySegments(value, identity, trade)` splits a candidate on identity separators
  (`|`, `·`, `•`, `▪`, `◦`, `●`, `/`, and a spaced `-`, `–`, or `—`).
  - Empty result = identity. This covers contact data, the target title, the trade or its parts, and any
    verified job title. It also covers title-shaped text (a phrase ending in a role noun such as mechanic,
    technician, or supervisor) and any composite made only of those plus trade labels.
  - A value with no identity segment is kept intact (`Plumbing / Building Maintenance`).
  - A mixed value keeps only its capability segments (`HVAC Technician | Preventive Maintenance` →
    `Preventive Maintenance`).
- `isResumeIdentityTerm` is true when `competencySegments` returns nothing. It is used by the canonical
  source record, upload prefill, the generation mapping, and the post-structure hard gate.
- Trade labels such as `HVAC`, `Plumbing`, and `Electrical` count as identity only next to a title.
  Standalone, they remain valid capabilities unless they equal the candidate's own trade.
- `groundedCompetencies` filters identity first. When fewer than 6 source-supported competencies remain, it
  adds evidence-backed labels from `COMPETENCY_RULES`, capped at 12. A label is added only when a single
  verified fact matches every pattern in one of its evidence sets. The facts considered are role bullets,
  technical skills, tools, equipment and systems, software, safety, and narrative facts. The raw
  upload header is excluded because it carries title and trade identity.
- A derived label is skipped when it is already covered by an existing skill, or when any part of it is the
  candidate's trade.
- `skillSupported` accepts a derived label only when its evidence rule matches. The grounding audit cites
  the matching facts as evidence.
- Backfill runs on fresh generation and on verified-source recovery. It is **disabled** for paid customer
  corrections (the customer may have removed a skill on purpose) and in the post-structure hard gate,
  which only filters.

Pagination (`worker/resume-documents.ts`):

- PDF `writeJob` reserves heading + employer + first bullet only, then writes bullets normally. A bullet that
  does not fit starts a new page with the existing `(continued)` job heading. Individual bullets never split.
- DOCX: the job heading and employer line keep `keepNext`, which binds them to the first bullet. Bullets keep
  `keepLines` and no longer carry `keepNext`.
- The measured compact one-page layout is unchanged. It still applies only when the full resume fits on
  one page. No font sizes or spacing changed.

### Edge cases

- A job with no employer line: the heading `keepNext` binds directly to the first bullet.
- A job with no bullets: the heading and employer are still reserved together, as before.
- `A/C Repair`, `HVAC/R`: `/` splitting applies only when a segment is identity, so real capabilities
  containing `/` stay intact. `HVAC/R Technician` splits into `HVAC` and `R Technician`, both identity, so
  it is removed.
- A candidate whose trade is Plumbing never receives `Plumbing / Building Maintenance` as a derived label.
- Facilities Maintenance candidates: `Facility Maintenance` matches the trade (plural-insensitive) and is
  not added.
- Legitimate title-shaped phrases such as `Forklift Operator` are treated as titles and removed.
- A resume with 6 or more supported skills gets no derived labels.

### Regression scenarios

| Scenario | Expected |
| --- | --- |
| Model draft skills = `[Building Equipment Mechanic · HVAC]`, upload has no skills section | Composite removed; 12 source-backed competencies render in all three templates |
| Model service fails (verified-source recovery) on the same upload | Same 12 competencies |
| `Maintenance Supervisor \| Facilities`, `HVAC / HVAC Technician`, `Service Supervisor · HVAC` | Rejected |
| `HVAC Diagnostics`, `HVAC Preventive Maintenance`, `HVAC Controls`, `HVAC Installation`, `Refrigerant Service` | Kept |
| Verified job title offered as a skill | Rejected |
| Plumbing-only history | No HVAC, refrigerant, or leadership labels invented |
| Paid correction | Skills are filtered only, never backfilled |
| Four-job production-like PDF, all templates | Third job starts on page 1 with its first bullet; the rest continue under `(continued)` on page 2; every job and bullet present |
| Same DOCX, all templates | Only the heading and employer carry `keepNext`; no bullet carries `keepNext`; all bullets carry `keepLines` |

### Files changed

- `worker/resume-quality.ts` — composite identity splitting, verified job titles as identity, evidence-backed
  competency derivation, grounding support for derived labels
- `worker/resume-builder-base.ts` — passes trade and backfill policy (off for corrections) to mapping and
  repair
- `worker/resume-quality-hard-gate.ts` — filter-only competency cleanup through the shared helper
- `worker/resume-documents.ts` — PDF intro-only reservation; DOCX bullets no longer chained
- `tests/helpers/production-resume-fixture.ts` — fictional production-like four-job fixture
- `tests/helpers/resume-generation-harness.ts` — route-level generation harness
- `tests/resume-competency-mapping.test.ts` — composite identity, job-title, grounding, and three-template
  route tests
- `tests/resume-documents-pagination.test.ts` — PDF split and DOCX keepNext tests for all templates. The old
  test that required chained bullets was replaced.

### Acceptance criteria

- No competency section contains a composite title/trade string, a standalone job or target title, a trade
  label joined to a title, or any contact data, in PDF or DOCX, for plain, navy, and lead.
- Every competency is supported by a verified source fact, and the grounding audit cites it.
- The production-like fixture renders the target title under the name and at least 6 real competencies.
- No later job is pushed whole to the next page when its heading, employer, and first bullet fit.
- No job heading is ever orphaned at the bottom of a page.
- Every verified job, bullet, certification, and education item renders.
- `npm run lint`, `npm run typecheck`, and `npm test` pass.

## UI Design System — Approved September 2026 (branch `feat/resume-builder-ui-unification`)

This section is the source of truth for the Resume Builder **application interface**. It replaces the earlier
dark navy / cream / gold / condensed-display look on every Resume Builder screen. Future changes must follow it;
do not reintroduce dark full-page backgrounds, cream form surfaces, gold accents, or condensed display fonts.

Scope: interface chrome only. The generated resume and cover-letter documents (PDF/DOCX/preview files, their
fonts, colors, and the three templates) are governed by the "Approved behavior" above and are not part of this system.

### Where it lives

| File | Role |
| --- | --- |
| `app/resume-builder/rb-foundation.css` | Design tokens + shared primitives (type reset, buttons, fields, alerts, account states). Imported by `resume-builder.css` and by the homepage for the account step. |
| `app/resume-builder/resume-builder.css` | Builder layouts: header, progress, cards, wizard, upload, review workspace, template cards, responsive rules. |
| `app/resume-builder/trade-landing.module.css` | `/resume-builder/<trade>` landing-page layout, built only from `--rb-*` tokens. |
| `app/resume-builder/rb-font.ts` | Inter via `next/font/google` (self-hosted at build), exposed as `--font-rb`. |
| `app/resume-builder/resume-builder-header.tsx`, `flow-steps.tsx` | The one header and the one progress indicator. |

Rules: use `var(--rb-*)` tokens, never raw hex values, in Resume Builder styles. Put new shared primitives in
`rb-foundation.css`; do not copy button/field CSS into page modules. Tokens are defined on `.rb-page` (every builder
`<main>`) and `.rb-scope` (builder UI rendered elsewhere, e.g. the homepage account panel).

### Colors

| Token | Value | Use |
| --- | --- | --- |
| `--rb-navy` | `#0F2D5B` | Header, footer, secondary-button text, focus outline, headline first line |
| `--rb-red` / `--rb-red-hover` | `#D71920` / `#B8141A` | Primary actions, selection, active/completed progress, headline emphasis |
| `--rb-red-soft` / `--rb-red-border` | `#FEF2F2` / `#FECACA` | Error alert ground, selected-chip and icon tints |
| `--rb-error` | `#B91C1C` | Error titles and text on light red (AA) |
| `--rb-success` / `-soft` / `-border` | `#15803D` / `#F0FDF4` / `#BBF7D0` | Saved/ready/verified states (AA) |
| `--rb-warning` / `-soft` / `-border` | `#A16207` / `#FFFBEB` / `#FDE68A` | "Action needed" badges only |
| `--rb-bg` | `#FAFAFB` | Page background |
| `--rb-surface` | `#FFFFFF` | Cards, inputs |
| `--rb-soft` | `#F8FAFC` | Soft panels inside cards, consent boxes |
| `--rb-text` | `#0F172A` | Primary text |
| `--rb-text-2` | `#64748B` | Secondary text, helper copy |
| `--rb-muted` | `#94A3B8` | Placeholders, future-step outlines, decorative only (below 4.5:1 — never body copy) |
| `--rb-border` / `--rb-border-strong` | `#E5E7EB` / `#CBD5E1` | Card borders / input and secondary-button borders |

### Typography

- One family: **Inter** (`--rb-font`, falling back to the system UI stack). No Anton/Impact/display fonts.
- H1: 800 weight, `clamp(30px, …, 46px)` — ≈46px desktop, 30–36px tablet/mobile, line-height 1.1.
- H2: 700, 24px mobile → 30px desktop. Wizard step titles and review/topbar titles use the H2 scale.
- H3: 700, 18–20px.
- Body 16px, line-height 1.55–1.6. Helper/small copy 13–14px. Labels 14px/600.
- Sentence case everywhere. ALL CAPS only for small eyebrows (`.rb-kicker`, 12px/700, 0.08em tracking) and
  tiny labels. No leading "/ " on eyebrows. No oversized decorative type.

### Buttons (`.rb-button`)

- One height: `--rb-control-h` = 48px (40px in the header and inside alerts). Radius 8px. 15px/600, no uppercase,
  no letter-spacing. Arrow glyphs are `aria-hidden`.
- Primary `.rb-button-primary`: red background, white text; hover `--rb-red-hover`.
- Secondary `.rb-button-secondary` (aliases `.rb-button-secondary-dark`, `.rb-button-ghost`): white, navy text,
  `--rb-border-strong` border; hover navy border + soft ground.
- Disabled: `#F1F5F9` ground, `--rb-text-2` text, `not-allowed` cursor — clearly inactive.
- Text actions `.rb-text-button` / `.rb-text-link`: red, underlined.

### Cards

- White, 1px `--rb-border`, radius 12px (`--rb-radius-lg`; 10px for inner cards), `--rb-shadow-sm`; `--rb-shadow`
  on hover or for the one primary card on a page.
- Selectable cards (`.rb-trade-card`, `.rb-level-card`): radio circle top-right; selected = red border + 1px red
  ring + faint red tint + filled red check. Hover = stronger border + shadow. No gold or thick borders.

### Forms

- Inputs/selects/textareas: white, 1px `--rb-border-strong`, radius 8px, 48px tall, 16px text (prevents iOS zoom).
- Label above field, 6px gap, 14px/600; optional hints inline in 13px `--rb-text-2`.
- Focus: navy border + `--rb-focus-ring` (navy 22%). Invalid: red border + faint red ring, with the step's error
  list in an alert. Checkboxes use `accent-color: --rb-red`.

### Header

- `ResumeBuilderHeader` on every builder route: full-width navy bar, contents in the 1240px container.
- Left: approved Resume Builder logo (44px; 36px mobile) + "TRADE HUSTL**3**" wordmark + divider + "Resume Builder".
- Right: "Exit builder" (outlined, white) or, on trade landing pages, the red "Build my resume" CTA.
- Mobile (≤640px): 56px tall, product label hidden; ≤380px shows the logo only.

### Progress indicator

- `FlowSteps` (Account → Experience → Preview → Unlock → Download) sits directly under the header on every flow
  page, on a white bar. Current = filled red circle + bold label; completed = red check on light red + red
  connector; future = gray outline. Mobile shows numbers for all steps and the label for the current step only.
- The guided intake keeps its inner 7-step progress (Trade … Generate) as a white card using the same states.

### Desktop layout

- Container `min(1240px, 100% − 2 × gutter)`; gutter `clamp(16px, 4vw, 32px)`. Page background `--rb-bg`.
- Intake: headline block, then the wizard card with the HUSTL3 BOT + "What you get" rail (300px) on the right —
  except the Get Started step, which uses the full width and drops the rail below.
- Review: preview (≈70%) + sidebar (≈30%). Before the first build: document frame left, system selection right.

### Mobile layout (375 / 390 / 430px)

- Everything stacks to one column; no fixed widths; `minmax(0, 1fr)` grids so long words never force overflow.
- 16–20px side gutters; form fields full width; tap targets ≥ 40px (buttons 48px).
- Wizard Back/Continue stay in a sticky bottom action bar inside the card (existing behavior).
- HUSTL3 BOT collapses to a toggle; the preview iframe is replaced by the "View my watermarked resume" button
  below 820px (existing fallback).

### Upload experience (Get Started step)

- Headline: "Upload your resume once. / We handle the rest." — first line navy, second line red.
- Left column: large dashed white drop zone (whole zone clickable, keyboard focusable via the file input) with
  document icon, "Upload your existing resume", drag-and-drop copy, red "Upload resume" button, and rules
  "PDF or DOCX · 5 MB maximum · original file is not stored". Dropped files use the same `importResume` path as the
  picker. Then an "OR" divider and the secondary "Start from scratch" button (with a trade chosen it acts as
  Continue; otherwise it moves focus to the trade list and shows the trade error).
- Right column: "Choose the trade you want to target" — all seven supported trades as selectable cards with an
  icon, name, one-line description, and radio/check. (The list must match `ALLOWED_TRADES` in the worker; do not
  add an "Other" card unless the backend accepts it.)
- Continue sits beneath in the wizard action bar. Mobile order: upload → Start from scratch → trades → Continue.
- After upload: white "import complete" card with a snapshot grid, green "Ready" / amber "Action needed" badge,
  and only the flagged items, each as a bordered issue card.

### Template (resume system) cards

- Field Pro, Modern Trade, Lead / Supervisor (`plain` / `navy` / `lead`): list cards with a mini layout thumbnail,
  name, tagline, note, and radio/check; selected = red border + red check.
- First build: document frame on the left shows a larger layout sketch of the selected system; the right column
  holds the heading, the cards, and the red "Build my watermarked preview" CTA.

### Error states

- `.rb-alert` component: light red ground, red border, red "!" icon, red title, readable body, optional action.
- Generation failures on the first build render directly under the Build button as "We couldn't build your
  preview" with a **Try again** button that re-sends the same first-build request. Other failures use "Something
  went wrong" without a retry. Success/info messages use the neutral/green message style.
- Intake-update notices, wizard validation lists, and inline errors share the same red alert styling.
- Presentation only: error codes, `MODEL_OUTPUT_ERROR` handling, run accounting, and messages come from the API unchanged.

### Route coverage

| Route | Status |
| --- | --- |
| `/resume-builder` | Redirects to `/#resume-start`; the homepage account panel uses the system via `.rb-scope`. |
| `/resume-builder/confirm` | Updated (magic-link confirmation card). |
| `/resume-builder/intake` | Updated (Get Started, all 7 guided steps, upload verification). |
| `/resume-builder/review` | Updated (system selection, preview, cover-letter tab, quality, bullet workshop, corrections, unlock, downloads, loading/empty/error/working states). |
| `/resume-builder/payment-confirmed` | Updated (checking / waiting / ready / error). |
| `/resume-builder/{hvac, electrician, plumbing, facilities-maintenance, welding-fabrication, construction-carpentry, general-labor}` | Updated visual system. Section headings are ALL-CAPS strings in `trade-landing-content.ts` (SEO copy) and still need a sentence-case copy pass. |
| `/resume-builder/electrical` | Permanent redirect to `/resume-builder/electrician`. |
| `/resume-builder/refund-policy`, `/resume-builder/ai-disclosure` | Not yet migrated: rendered by the site-wide `PolicyPage` shell shared with `/privacy` and `/terms`. |

### Responsive requirements (acceptance)

1. No horizontal scroll at 375, 390, 430, 768, 1024, 1280, 1440px on any route above.
2. No clipped cards or hidden Continue/Build/Unlock buttons; the wizard action bar stays reachable.
3. Headings ≤ 36px on phones; body text 16px; no two-column layout below 900px (Get Started, first build).
4. Visible focus on every interactive element; selection is never color-only (radio/check glyph + `aria-checked`).
5. `prefers-reduced-motion` disables transitions and spinners.
