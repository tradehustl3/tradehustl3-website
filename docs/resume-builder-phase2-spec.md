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
