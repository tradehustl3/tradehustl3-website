# Homepage audit corrections

Source baseline: `a936a95a46f207c2c8e81111187980df1bb52201` on `main`.
Production text inspected at https://tradehustl3.com/ on November 11, 2026.
This branch is for review only; no merge, deployment, live checkout, or customer-data access was performed.

## Confirmed corrections

- The production book hero said “BACKED BY TRADE.” The hero now uses “BUILT BY HUSTL3. BACKED BY TRADES.” The source footer and policy footer already use the plural slogan.
- Public author wording and root creator metadata use MR. HUSTL3. The Person structured-data record retains Zachary Ellis and its existing stable identifier, with MR. HUSTL3 as alternateName. Book bibliographic references still point to that Person.
- The catalog distinguishes 14 career families, 207 mapped job titles, eight featured homepage trades, and seven detailed worked resume guides. The seven-example data is shared with the catalog counter. There are also eight live builder landing pages, including heavy equipment; those pages remain available and are counted separately internally.
- The actual Jordan Taylor sample image has overlapping name/contact text. The legacy PDF writer advanced only 14.2 points after a 21.5-point name. Its line height now reserves at least 1.3 times the font size. The public WebP is regenerated from the corrected renderer, with the original illustrative wording and appearance preserved.
- Legacy DOCX files used the library's A4 default while PDFs were US Letter. Resume and cover-letter DOCX exports now explicitly use US Letter. Existing margins and fonts remain in place.
- The homepage skip link targets a keyboard-focusable content container after navigation. The existing accessible logo name “TRADE HUSTL3 home” remains.
- Homepage font variables now wrap the footer as well as the hero. Footer text and branding explicitly use the approved Barlow families, avoiding fallback outside the previous font scope.
- The repeated expanded “Find your lane” heading now identifies the eight featured trades. The book-first hero, Resume Builder section, silhouettes, female-trades imagery, certification artwork, and red/blue/gold treatments remain.
- The credential picker's primary destination follows the selected trade. A generic student credential link opens the by-trade index rather than arbitrarily selecting HVAC. Existing card links retain their exact credential/trade anchors.
- README analytics instructions now match the default GA property, optional-tracking controls, and marketing-tag allowlist. Privacy already identifies GA, Meta, Pinterest, and the opt-out/GPC behavior.

## Document evidence

`node --import tsx tools/audit/generate-homepage-samples.ts` generates an illustrative resume and matching-format cover letter in PDF and DOCX under `output/homepage-audit` without calling any external API. The cover letter reproduces the public Jordan Taylor sample; the resume uses the existing Marcus Reed fixture.

`python3 tools/audit/render-homepage-cover.py` rebuilds the public WebP directly from the generated cover-letter PDF. It requires PyMuPDF and Pillow.

Both PDFs were rendered and visually inspected. Both DOCX files were rendered with the bundled headless LibreOffice through `render_docx.py` and visually inspected, including a second cover-letter render after the US Letter correction. All four outputs fit one page, with readable alignment, margins, and no header overlap. The PDFs embed their fonts with Unicode mappings (Roboto for the cover letter, Carlito for the current resume fixture). DOCX rendering remains dependent on fonts installed by the receiving application.

The new regression tests generate real PDF/DOCX files across all three themes and both template versions, check cover-letter header separation and page bounds, confirm extractable ordinary text, and verify explicit US Letter dimensions. Existing pagination and ATS tests provide broader coverage; no universal ATS compatibility claim is made.

## Verification status

Results are being finalized on this branch. The initial local test command could not build until dependencies and source assets were recovered through the offline npm cache and connected GitHub tools. The bundled Node 24 runtime is used for final checks.

### Passed

- Lint and TypeScript checking after dependency recovery.
- Real document generation, rendered visual inspection, embedded-PDF-font inspection, and the document regression test file.
- Source review of the shared book-sample browser flow: requests return the `/book/sample/read` reader link, and book-sample success links use the same browsing context. Existing signed PDF links remain supported.

### Failed or pending

- Full-suite results are pending final build and test completion. Early wording assertions were updated to the approved author brand and clarified heading.

### Unverified

- Desktop, tablet, and phone browser screenshots; keyboard behavior in an actual browser; computed footer font; responsive card/spacing/background rendering. Browser automation host is unavailable.
- Production tag network requests, opt-out changes, conversion-event receipt in analytics dashboards, and actual email inbox delivery. Local tests use synthetic data and mocked providers.
- Official ownership/current branding of non-GitHub social profiles. Existing social destinations were not changed.
- Live catalog/certification/reader HTTP checks: the web reader could retrieve the production homepage and privacy text, but returned access errors for these secondary pages. Local rendered routes and anchor tests are the available evidence.
- Authenticity of any individual customer's statement was not independently re-audited. The existing consent/approval/paid-order review pipeline and illustrative-sample labels remain; no fictional review was published.

Approval remains required before merging or deploying. Browser and live-provider checks above should be completed before release.
