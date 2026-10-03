# Career track and appearance

Branch-only change; no migration, deployment, merge, or main push performed.

`resumes.theme` remains the appearance choice. `generation_track` records the writing track (`plain` = Field Pro, `navy` = Modern Trade, `lead` = Lead / Supervisor). PDF and DOCX headings use the writing track; colors, typography, spacing and section order use appearance. Initial successful generation records the selected track. Normal corrections keep it. Explicit `POST /resumes/:id/generate` with `{ "generationTrack": "lead" }` uses the existing paid correction reservation, factual validation, and failure restoration; only success persists the new track. Appearance-only PATCH remains free.

Review offers “Rewrite for this style” and “Keep my current wording.” A rewrite requires payment and one available shared correction. Cover letters retain their own writing track in stored cover JSON, inherit the resume writing track on first generation, and accept the same explicit `generationTrack` option through their existing guarded correction endpoint. Rewriting each document separately uses one shared correction each. Changing appearance alone never rewrites either document. Cover letters have no track-specific section headings.

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

- `npm test`: production build succeeded; 512 tests passed, 0 failed.
- Seven new regression tests cover PDF/DOCX headings, free appearance changes, exact correction accounting and exhausted-limit rejection, SQL backfill/rollback, legacy DOCX compatibility, failure credit restoration, and independent cover-letter writing tracks.
- Existing checkout test uses mocked `sk_test` / `price_test` and `cs_test` checkout creation; signed webhook tests verify unlock and replay behavior. No live Stripe network transaction was performed.
- `npm run typecheck`: passed. ESLint on changed TypeScript/TSX files: passed. `git diff --check`: passed.

## Changed files

- `worker/resume-builder-base.ts`: load/expose/persist generation track, select the writing profile, reuse paid guarded correction accounting for explicit track rewrites.
- `worker/resume-builder.ts`: retain generation-track headings during free appearance rerenders.
- `worker/resume-documents.ts`: separate PDF/DOCX heading labels from display layout.
- `worker/cover-letter.ts`: inherit and retain independent cover writing metadata and support guarded explicit track rewrites.
- `app/resume-builder/review/resume-review.tsx`, `cover-letter-panel.tsx`: offer rewrite/keep choices and enforce available paid corrections in the UI.
- `db/schema.ts`: additive generation-track field.
- `drizzle/0008_resume_generation_track.sql`, `0008_resume_generation_track_down.sql`: forward and rollback SQL.
- `tests/resume-generation-track.test.ts`: seven regressions using actual document rendering and in-memory SQLite D1.
- This document: compatibility, rollout/rollback and verification notes.
