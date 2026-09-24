# Resume generation MODEL_OUTPUT_ERROR investigation

## Evidence and limits

Inspected main at `97c6545`. No failing production provider payload, request ID, or timestamp was supplied. The customer-visible error is a catch-all, so it cannot prove the production failure category. The findings below are reproducible code defects, not a claim that the historical incident's raw response was inspected.

1. **Provider truncation:** the worker requests 8,000 Gemini output tokens; the bridge overwrote that with 4,000. The worker explicitly throws on `finishReason: MAX_TOKENS`, which becomes `MODEL_OUTPUT_ERROR`. The bridge now honors positive integer caller budgets up to 8,000, retaining a 4,000 default. Smaller import budgets are also respected. Thinking level, model selection, authentication, and other controls are unchanged.
2. **Provider text assembly / malformed JSON:** both generation adapters inserted `\n` between JSON text fragments. The regression fixture splits `Devon` inside a quoted string. Before parsing, the old adapter produces `"Dev\non Price"` with a literal newline, and the endpoint returns the exact reported error. Concatenation preserves the provider bytes and succeeds under the same factual checks. Existing fenced-JSON handling is retained; no facts, keys, citations, or missing field values are invented to repair output.

Before implementation, bridge cost-control and six provider/theme regression cases failed. After implementation they pass. A route-to-real-bridge test simulates provider truncation under the old ceiling and success with the requested budget; this is a mocked provider response, not production evidence.

## Complete call path

- `app/resume-builder/intake/wizard.tsx` saves intake and separate title/trade fields, then opens review.
- `app/resume-builder/review/resume-review.tsx`: theme PATCH saves `plain`, `navy`, or `lead`; the preview button invokes `runGeneration()` and POSTs `/api/resume-builder/resumes/:id/generate`.
- `worker/index.ts` routes to `worker/resume-builder-monitored.ts`, then `worker/resume-builder.ts`.
- The wrapper checks upload coverage and intake substance, applies preservation instructions, and wraps preview attempt accounting.
- `worker/resume-builder-base.ts`: route dispatch → `generateResume()` → generation lock/run reservation → `callResumeModel()` → `callGemini()` or `callAnthropic()`.
- Gemini calls the bridge `/generate`; `services/resume-ai-bridge/app.mjs` calls Vertex `:generateContent` and returns the provider response. Anthropic calls `/v1/messages` directly. Configured provider fallback remains bounded to one alternate call for provider failures, with full validation of its output.
- Text assembly → `parseModelResume()` → `validateModelResume()` → schema/substance validation → canonical source mapping → numeric/source/citation checks → existing bounded source-only repair → final numeric/source validation and grounding audit.
- `worker/resume-documents.ts` creates DOCX, PDF, and watermarked PDF; generation writes files and records the successful resume. The wrapper applies package hardening and the final quality gate.
- UI reloads the resume, then displays `/api/resume-builder/resumes/:id/files/preview` in its iframe. The base file handler serves the stored preview PDF. All three systems use this same path.

## Error creation, mapping, and accounting

Originally the inner catch in `generateResume()` (main line 2332) created `MODEL_OUTPUT_ERROR` for any untyped `callResumeModel()` exception. The outer catch maps it to HTTP 502, the fixed retry message, and `runConsumed: false`; it restores the generation status and reserved credit. The review UI appends `(error: MODEL_OUTPUT_ERROR)`. The monitoring wrapper observes the 5xx but does not create that code.

Internal typed model failures now record only provider, fixed stage, and optional HTTP status in logs and the existing `resume_generations.guard_flags` field. Stages distinguish configuration, transport, HTTP, provider JSON/envelope, truncation, blocked/non-successful provider stop, empty output, and resume JSON parsing. Schema rejection records fixed missing-section labels. Existing numeric and quality rejection telemetry remains intact. No raw JSON, candidate details, prompts, secrets, arbitrary provider messages, or JSON parser messages are logged or added to the customer response.

Schema, numeric, and source/quality rejections cannot trigger cross-provider fallback or uploaded-source recovery. Malformed/rejected responses cannot become a charged source-recovery success, including when the primary response is rejected and the fallback service is unavailable. Existing source recovery for service unavailability remains. Failed corrections preserve existing JSON/files and restore reserved runs. The pre-existing outer numeric retry still validates every attempt and cannot admit unsupported numeric output; no new factual retry is introduced.

Invalid citation IDs were not the cause of either reproduced failure: the old pipeline regenerates grounding citations from verified source evidence when model citations are invalid. This behavior is unchanged and existing invalid-ID/claim-source tests are retained.

## Title/trade finding (unchanged)

The review header renders persisted `resume.title` and `resume.trade`, before generation. The wizard saves `data.targetJob.title` and `data.trade` independently. Guided intake supports independent selections, including trade preselection from a landing page/draft.

For uploaded resumes, `resume-upload.ts` chooses target title from imported `targetJobTitle`, otherwise the first imported job title, otherwise the existing target title. Trade is chosen separately from an allowed imported trade, otherwise source-text trade inference, otherwise the existing trade. Confirmed user corrections are preserved. Thus a plumber-helper title can coexist with an HVAC trade; generation does not produce these review-header values. Without the incident's saved intake, the exact branch that supplied each value cannot be determined. No title/trade normalization was changed.

## Regression coverage

- Split JSON under Gemini and Anthropic for Field Pro, Modern Trade, and Lead/Supervisor; successful preview/file creation and one consumed successful run.
- Worker → real bridge → mocked Vertex budget propagation for each system.
- Bridge cap, valid smaller budget, default, and invalid input bounds.
- Both providers: HTTP, malformed envelope JSON, wrong envelope shape, empty text, malformed resume JSON, and truncation; preserved prior correction output/files, restored credit, and safe internal telemetry.
- Schema rejection does not invoke fallback; unsupported correction dates remain rejected; malformed uploaded output and malformed-primary/fallback-outage combinations cannot consume a run.
- Existing source identity/contact/date, credentials, unsupported skills/duties/education, numeric grounding, invalid sourceFactIds, source-preservation, and quality-gate suites retained unchanged.

No configuration, payment logic, database migrations, authentication, SEO, marketing, or UI changes. No merge or deployment.

## Validation results

Using Node 24.21.0 (repository requires Node >=22.13.0):

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- `npm test`: pass, 369 tests, zero failures (includes production build).
- All `tests/resume*.test.ts` and `tests/resume*.test.mjs` executed separately: 297 tests across 29 files passed; after the final fallback-outage regression was added, the generation safety file was rerun with all 42 tests passing.
- `git diff --check`: pass.

The initial sandboxed full run could not write the existing dependency cache; the approved run outside that restriction completed. No code/configuration change was made to bypass that build restriction.
