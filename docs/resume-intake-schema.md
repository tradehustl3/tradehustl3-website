# Resume intake schema version and upload retention

## Where the data lives

The customer's structured resume facts live in `resumes.intake_json` in D1, keyed by
`resume_id` (the canonical draft identifier). Browser state is only a cache and is
rehydrated from `GET /api/resume-builder/resumes/:id` on every load, so the draft survives
wizard navigation, refresh, review, template selection, and the Stripe round trip
(`success_url` → `/resume-builder/payment-confirmed?resume_id=…`,
`cancel_url` → `/resume-builder/review?resume_id=…`).

There is no separate candidate-profile table. No D1 migration is needed for anything below.

## `meta.schemaVersion`

`intake_json.meta.schemaVersion` versions the **shape of the persisted intake JSON**.
It is independent of `meta.wizardVersion`, which tracks the wizard UI revision and is kept
unchanged (currently `4`).

| Version | Meaning |
| --- | --- |
| absent / `0` | Written before versioning. Same shape as version 1. |
| `1` | Current. `contact`, `career`, `fieldValue`, `experience[]`, `education`, `additionalDetails`, `sourceResumeText`, `targetJob`, `meta`. |

Behavior:

- The browser writes `schemaVersion` (`INTAKE_SCHEMA_VERSION` in
  `app/resume-builder/intake/wizard-data.ts`).
- The server is authoritative. On every create/update it stamps the current version, so an
  unversioned intake from an older cached browser is saved as version 1. That is safe
  because versions 0 and 1 have the same shape.
- The server refuses (HTTP 400, "Refresh the page and try again.") an intake whose version
  is newer than it understands, instead of storing it under the wrong label.
- Readers use `intakeSchemaVersion(intake)`, which returns `0` when the field is missing or
  invalid. `fromIntake` reads versions 0 and 1 the same way.

When the shape changes in the future: bump `INTAKE_SCHEMA_VERSION`, teach `fromIntake` (and
any server reader) to upgrade older versions on read, and describe the new version in the
table above. Stored rows are upgraded lazily on their next save, not by a bulk migration.

## Upload privacy boundary

- The PDF/DOCX file never leaves the browser. The browser enforces PDF/DOCX and the 5 MB
  file limit, extracts the text, and sends only that text.
- `POST /api/resume-builder/resume-import` validates what it actually receives:
  - `fileType` must be the string `pdf` or `docx`.
  - `fileName` and `text` must be strings.
  - `text` must be 80–100,000 characters and at least 12 words, with no NUL bytes.
  - Anything else gets a 400 before any model call.
- The rate limit (10 per user per hour) is checked first, so malformed requests count
  toward it too.
- Only `text` feeds extraction and grounding. Any other field the browser sends, such as a
  prefill, field states, or a "grounding source", is ignored. The server also recomputes
  saved `meta.uploadFieldStates` itself.

## Retention of uploaded resume text

`sourceResumeText` (the extracted text of the upload) is stored inside `intake_json`. The
original file is never stored. Cleanup runs in the existing scheduled job,
`runResumeBuilderRetention` in `worker/resume-builder-base.ts`:

- **Unpaid drafts:** unchanged. The whole draft, its files, and its generations are deleted
  after 37 days without an update.
- **Paid resumes** (active entitlement or paid order): 90 days after the last generation or
  edit (both bump `updated_at`), only `sourceResumeText` is removed. The job then sets
  `meta.sourceResumePreserved = false` and `meta.sourceResumeTextPurgedAt`.
  - The structured intake, the generated resume, and the purchased files are kept.
  - `updated_at` is not touched, so the cleanup never counts as customer activity.
  - The step is idempotent.

After cleanup, later correction runs check facts against the structured intake only. That
is stricter than before, not looser.
