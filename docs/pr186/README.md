# Production resume templates

This branch implements the three layouts from Resume Design Mockups.pdf as version 2. Field Pro corresponds to page 1, Modern Trade to page 2, and Lead / Supervisor to page 3. The sample content is fictional and kept constant across designs so layout differences can be reviewed independently of AI wording.

## Samples for visual approval

| Design | Resume PDF | Resume DOCX | Cover letter PDF | Cover letter DOCX |
| --- | --- | --- | --- | --- |
| Field Pro | [PDF](samples/plain.pdf) | [DOCX](samples/plain.docx) | [PDF](samples/plain-cover.pdf) | [DOCX](samples/plain-cover.docx) |
| Modern Trade | [PDF](samples/navy.pdf) | [DOCX](samples/navy.docx) | [PDF](samples/navy-cover.pdf) | [DOCX](samples/navy-cover.docx) |
| Lead / Supervisor | [PDF](samples/lead.pdf) | [DOCX](samples/lead.docx) | [PDF](samples/lead-cover.pdf) | [DOCX](samples/lead-cover.docx) |

Shared content retains its writing-track headings when a customer changes the presentation. The samples use each design's corresponding writing track. Scope is displayed only for Lead / Supervisor when explicit customer scope or crew/account responsibility exists in a uniquely matched intake role; the renderer does not infer scope from a title or invent leadership responsibilities. Modern Trade groups existing skills deterministically, falling back to a plain two-column grid when a skill cannot be classified.

All 486 design and customization combinations are covered by output tests. Settings are free, never call AI, and do not reserve or modify correction credits. Resume and existing cover-letter outputs are staged in new immutable storage objects, then file pointers and settings switch in a single D1 batch. A failed render or upload preserves the previous package. Existing immutable objects are retained for rollback and standard account cleanup.

## Compatibility and release order

Migration 0009 is additive and defaults existing resumes to version 1. New resumes use version 2. An existing resume opts into version 2 on its first presentation change. Version-1 renderers remain unchanged, with deterministic byte regression coverage under a fixed clock.

Before applying migration 0009, export a D1 restore point using the existing production database identifier and record the current deployment, database export, settings, and resume_files object pointers. Confirm the export can be restored. Apply the forward migration only after founder approval and before deploying code that reads the new columns. This branch does not apply a production migration, merge, or deploy.

Rollback requires restoring the prior application build and the captured settings and file pointers, then applying `drizzle/0009_resume_customization_down.sql` after the new application no longer reads those columns. Already downloaded documents remain valid. Do not delete version-2 immutable objects until the rollback window has closed.

## Protected preview

Every device uses authenticated pdf.js canvas rendering with zoom, fit-to-width, page arrows and counts. No native browser PDF viewer, text layer, Print control, Download control, or raw-PDF fallback link is rendered. Paid download links remain outside the viewer behind existing server entitlement checks. The watermarked PDF still reaches the browser: this is a controlled preview, not DRM. Server-rendered preview images remain a possible later improvement.

## Fonts and measurements

Arimo, Carlito and Gelasio are embedded, with OFL licenses in `worker/fonts`. The bundle removes hinting and unused shaping metadata while preserving supported Unicode. Per-document subsetting removes unused glyph outlines and retains composite dependencies and original glyph IDs, avoiding the missing-glyph problem in Fontkit's renumbered Arimo/Carlito subsets. Standard ligatures are disabled to preserve correct text extraction. DOCX specifies Arial, Calibri or Georgia, as approved.

`render-timings.json` records local PDF plus DOCX generation time, excluding network and storage. `worker-size.json` records the compressed built Worker size against a conservative 3 MiB limit. These are local measurements, not a claim about production latency.

Regenerate samples with `node --import tsx tools/pr186/generate-samples.ts`; recreate thumbnails from the first PDF page using Poppler at 480 px. Run `node tools/pr186/check-worker-size.mjs` after the production build. Font regeneration instructions are in `tools/pr186/build-fonts.py`.

## Production Smoke release blocker

The latest main-branch Production Smoke run (37165554396) fails on the homepage with HTTP 403 and `cf-mitigated: challenge`. Cloudflare challenges requests before they reach the Worker. The existing `X-Smoke-Token` header alone cannot bypass this challenge. A narrowly scoped Cloudflare rule and secret coordination require separate approval; this branch does not silently weaken edge protection or treat a challenge response as success. The smoke job remains a release gate until that external configuration is resolved.

Update 2026-10-06: Cloudflare Security Events identify the challenge as **Bot Fight Mode**. On the free plan it cannot be skipped by any WAF rule. The owner kept it on, and a challenged run now reports "Smoke inconclusive - Cloudflare challenge". Deploys are verified manually per `docs/production-verification.md`.
