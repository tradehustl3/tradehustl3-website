# Unpaid resume preview lock

## Why

The watermarked preview used to show every line of the resume and cover letter in
clear text. A customer could read, screenshot or retype the finished document,
so there was little reason to pay $9.99, and checkout was only reachable by
scrolling past the whole sidebar on a phone.

## Policy (`worker/resume-preview-lock.ts`)

Readable in the unpaid preview:

- header, summary, skills, certifications, education
- every job title, employer, location, dates and Lead / Supervisor scope line
- the first two experience bullets in reading order, and never more than half of
  all bullets (a one-bullet resume shows none)
- cover letter: everything except body paragraphs after the first

Locked: the remaining experience bullets, additional information, and cover-letter
body paragraphs after the first. Locked lines are drawn as word-shaped gray bars
measured with the real font, so pagination is identical to the paid file.

Locked words are never passed to `drawText`, so they are absent from the PDF bytes.
This is server-enforced, not a CSS blur. The unpaid status payload applies the
same rule: locked bullets return `locked: true` with an empty `suggestion`, and
`original` contains only the customer's own source bullet.

## Serving

`GET /api/resume-builder/resumes/:id/files/preview` renders the preview from the
saved `generated_json` on every request, the same way the cover-letter preview
already works. Previews stored before this change contain clear text, so stored
`preview` objects are no longer served. A render failure returns 503 and never
falls back to a stored file. Paid PDF and DOCX files are unchanged and still come
from storage behind the entitlement check.

## Review page

- A fixed unlock bar (price, what's included, checkout button) stays on screen for
  unpaid customers, and hides while the full purchase card is visible.
- A note under each preview tab explains the gray lines, with its own checkout button.
- The bullet workshop shows locked bullets as locked cards for unpaid customers.

## Manual production check after deploy

Signed in with an unpaid test resume on a phone:

1. Open the review page. Gray bars replace most experience bullets; the header,
   summary and first two bullets are readable.
2. The unlock bar is visible at the bottom while reading, and disappears when the
   "Unlock the full package" card scrolls into view.
3. Tap the unlock bar. It opens the Stripe checkout page for $9.99.
4. After a test purchase, the clean PDF has no gray bars and no watermark.
