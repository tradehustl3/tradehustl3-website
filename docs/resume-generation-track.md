# Career track and appearance

Branch-only change; no migration, deployment, merge, or main push performed.

`resumes.theme` remains the appearance choice. `generation_track` records the writing track (`plain` = Field Pro, `navy` = Modern Trade, `lead` = Lead / Supervisor). PDF and DOCX headings use the writing track; colors, typography, spacing and section order use appearance. Initial successful generation records the selected track. Normal corrections keep it. Explicit `POST /resumes/:id/generate` with `{ "generationTrack": "lead" }` uses the existing paid correction reservation, factual validation, and failure restoration; only success persists the new track. Appearance-only PATCH remains free.

Review offers “Rewrite for this style” and “Keep my current wording.” Keeping the wording is a free appearance change and never uses a correction.

### Package career-track rewrite (one correction)

A customer-requested track change is a package correction, handled in `worker/resume-builder.ts` (`packageTrackRewrite`):

1. The resume is rewritten through the standard guarded correction path. That path reserves exactly one package correction, runs all factual guards and the numeric retry, hardens the result, and restores the correction itself if the resume step fails.
2. If a matching cover letter has already been generated, it is then rewritten to the same track from the rewritten resume (`rewriteCoverLetterForPackageTrack`). This step never reserves a second correction.
3. If the cover-letter step fails, the resume text and writing track are restored, the resume files are redrawn from the restored text, the single correction is returned, and a `package_rollback` row is logged. The cover letter is left untouched, so the package is never split across two tracks.
4. With no generated cover letter, the request is exactly a one-correction resume rewrite.
5. Requires payment and an available correction; the fourth attempt is refused (409) and changes nothing.

The cover-letter endpoint no longer accepts `generationTrack` (400, no correction used); track changes always go through the package path. Cover letters inherit the resume writing track on first generation, keep their track through normal corrections and free appearance changes, and have no track-specific section headings. Both rewrite prompts instruct the model never to invent leadership duties, accomplishments, metrics, certifications, tools, employers, titles, or dates.

The post-generation/pre-checkout hardener (`worker/resume-package-hardener.ts`) also renders headings from `generation_track` (falling back to `theme` for legacy rows) and now maps the Lead appearance correctly; previously it rendered Lead resumes with the Field Pro layout whenever it redrew them.

## Forward migration (0008_resume_generation_track.sql)

```sql
ALTER TABLE resumes ADD COLUMN generation_track TEXT
  CHECK (generation_track IN ('plain', 'navy', 'lead'));
UPDATE resumes SET generation_track = theme;
```

Apply migration before deploying application code. No existing column is dropped or renamed. New drafts can leave this nullable until content is successfully generated. Backfill deliberately preserves existing visible headings. Resumes whose theme was changed after generation cannot be detected retroactively; the current theme is the only available historical approximation. Existing cover letters without stored track metadata use the backfilled resume track until their next correction saves explicit metadata.

## Rollback (0008_resume_generation_track_down.sql)

Revert application code first, then:

```sql
ALTER TABLE resumes DROP COLUMN generation_track;
```

Only the added column is removed; existing theme, content, entitlements, and files remain. Saved track history is lost on rollback. Already-rendered documents are retained; reverting code restores the previous theme-dependent behavior on future renders. Optional cover JSON metadata is ignored by the old code.

## Validation

Follow-up commit (review fixes): verified by the repository Test workflow on the draft PR (npm ci, npm audit, lint, typecheck, full test suite). Local install was unavailable in the review environment. `git diff --check`: passed.

Regression tests in `tests/resume-generation-track.test.ts` cover: writing-track headings under a different appearance (PDF/DOCX); free appearance changes; resume-only track rewrite consumes exactly one correction and the fourth is blocked; migration backfill and rollback; legacy rendering unchanged; failed resume rewrite restores the correction; hardener keeps writing-track headings when it changes content; hardener legacy fallback to appearance; package rewrite updates both tracks for exactly one correction; failed cover-letter step rolls the package back with no correction used; package rewrite blocked at the limit; cover-only track rewrites refused; cover-letter normal corrections keep the track.

## Changed files

- `worker/resume-builder-base.ts`: load/expose/persist generation track, select the writing profile, reuse paid guarded correction accounting for explicit track rewrites.
- `worker/resume-builder.ts`: package career-track rewrite and rollback; retain generation-track headings during free appearance rerenders.
- `worker/resume-package-hardener.ts`: render headings from the writing track; correct Lead appearance mapping.
- `worker/resume-documents.ts`: separate PDF/DOCX heading labels from display layout.
- `worker/cover-letter.ts`: shared cover-letter writer; credit-free package companion rewrite; inherit and retain cover writing track; refuse cover-only track rewrites.
- `app/resume-builder/review/resume-review.tsx`, `cover-letter-panel.tsx`: rewrite/keep choices; package rewrite from either panel; "Keep my current wording" dismisses immediately.
- `db/schema.ts`: additive generation-track field.
- `drizzle/0008_resume_generation_track.sql`, `0008_resume_generation_track_down.sql`: forward and rollback SQL.
- `tests/resume-generation-track.test.ts`: regressions above, using actual document rendering and in-memory SQLite D1.
- This document.
