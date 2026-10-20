# TRADE HUSTL3 — Early-Career Resume Quality Audit (Resume Builder)

Scope: Resume Builder generation quality only. Not A03, not marketing content.
Mode: AUDIT AND PLAN FIRST. Report before implementing. No merge, no deploy.

## Problem
A trade-school graduate with about 1 year of experience got an acceptable but underwhelming resume.
Goal: applicants with 0–2 years of trade experience get a strong, specific, ATS-friendly resume,
built only from facts they gave us. Limited experience must not read as limited ability.

## Hard rules (unchanged, and now tested explicitly)
- Never invent employers, titles, dates, certifications, licenses, tools, equipment, systems, duties,
  accomplishments, metrics or education.
- Every bullet must trace to specific intake facts. "Stronger wording" may restate, order and name what
  the applicant gave; it may NOT add tasks they didn't list.
  Example: intake says "helped techs with HVAC repairs and maintenance".
  Allowed: "Assisted HVAC technicians with residential repair and maintenance calls" (if residential was given).
  NOT allowed: adding "equipment inspections" or "troubleshooting" unless the applicant listed them.
- Certifications keep their exact scope as entered: EPA 608 Type I/II/III/Universal, OSHA 10 vs 30,
  NCCER module or level. Never upgrade a type. "In progress" or "expected" stays labeled as such.
- School lab and shop work is never presented as paid employment. It goes under a clearly named
  training section (for example "Technical Training" or "Education & Hands-On Training"), never under
  "Experience", and never with an employer-style title or dates that imply a job.
- Non-trade jobs keep their real titles. Only responsibilities the applicant listed may be framed as
  transferable (safety, customer service, physical work, tools, reliability).

## 1. Audit (read-only) — report findings with file:line
1. Intake: which fields capture trade-school program, labs/shop projects, equipment and systems trained on,
   tools, certifications (with type and status), apprenticeship status, and non-trade jobs?
   What early-career information has nowhere to go?
2. Data flow: trace each of those from intake → stored JSON facts → prompt → structured output → quality gate
   → each template → PDF and DOCX. Where is information dropped, merged or flattened?
3. Prompts: is there any experience-level awareness? Does the prompt push early-career applicants toward
   generic phrasing ("hard-working", "eager to learn", "team player")?
4. Quality gate: what does it check today (provenance, numbers, length)? Does it catch generic filler or
   unused facts? Does it catch added tasks that aren't in intake?
5. Templates (all three): section order and how education/training/certifications are shown. Is training
   buried below thin experience? Keep the career-track vs template separation: experience-level ordering is
   a content-hierarchy decision applied the same way in every template, not a new template.
6. Find the actual underwhelming test output if it's stored (test fixture, local file, or dev record).
   Use it as the "before". Do not pull real customer resumes or PII for this audit.

## 2. Root causes
List each cause with evidence (file:line, prompt text, or output excerpt). Separate:
- missing intake data, vs
- data captured but not used, vs
- data used but phrased generically, vs
- layout hiding the strongest content.

## 3. Proposed Early-Career Trades strategy
- How "early-career" is determined: from verified dates and experience the applicant entered, not guessed.
  Show the rule and the edge cases (career changers, gaps, part-time).
- Section order for 0–2 years: Summary → Certifications → Technical Training (labs, systems, equipment)
  → Skills → Experience → Education, or justify a better order. Same order in all three templates.
- Summary rules: lead with the trade, the training program and the real credentials; state readiness
  without implying years of experience the applicant doesn't have.
- Bullet rules: name the specific system, equipment, material or procedure the applicant gave;
  no unsupported numbers; no filler adjectives.
- Any new intake fields must be optional, backward compatible, and listed with any D1 migration needed.

## 4. Objective evaluation (before vs after, identical verified facts)
Synthetic test personas only:
- HVAC, plumbing, electrical × 0, 1 and 2 years of experience = 9 scenarios.
- Include at least one with a non-trade prior job, one with a certification in progress,
  and one with EPA 608 Type II only (to prove it is never upgraded).
Measure for each, before and after:
- fact coverage: % of provided verified facts that appear;
- unsupported claims: must be 0 (any added task, tool, cert, number or date);
- generic-phrase count against a fixed list;
- specificity: named tools/systems/procedures per bullet;
- training clearly separated from paid work (yes/no);
- ATS: standard headings, single-column text extraction order, no content in headers/footers or images;
- PDF/DOCX parity and page count, with no orphaned headings.
Model output varies, so run each scenario at least 3 times and report the spread. Cap total model calls
and report the approximate cost before running.

## 5. Must remain intact (regression tests)
- JSON fact provenance and the numeric safeguards.
- ATS formatting in all three templates.
- PDF and DOCX generation and parity.
- Checkout, entitlement and payment protection.
- Corrections accounting: template switches and presentation changes still don't use a correction.
- Existing customers' stored resumes render unchanged. No automatic regeneration of paid resumes.

## Deliverable
1. Audit report: findings, root causes, proposed strategy, before/after examples, metrics.
2. Wait for approval.
3. After approval only: a narrowly scoped draft PR with regression tests for every hard rule above.
No merge, no deploy, no production data changes.
