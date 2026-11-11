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

Application commit `a2b527d0cc4781c0f978c1a13b507e150ecac059` passed the existing GitHub Test job (job `130781467120`): dependency installation, production dependency audit, lint, type checking, `npm test` (build plus all 87 test files), and worker-size check. The follow-up commit `1962424cf923853c0edc43c734595f52a9464fc5` changes only visual verification tooling; its workflows were still queued at the final status check.

### Passed

- The complete existing GitHub application test pipeline, including the font self-hosting assertion that could not pass in the offline local build.
- Local final build, lint, TypeScript check, and worker-size check (2,450,129 compressed bytes, below the 3 MiB free-plan limit).
- Real document generation and rendered visual inspection: two PDFs and two DOCX files, one page each. Seven new document regression cases pass, covering all six cover-letter theme/version combinations and legacy resume page dimensions.
- Final local rendered-page reruns: 54 main rendered/API checks, five seven-trade example checks, the shared-preview check, catalog source/rendered checks, and updated brand hardening checks pass. The homepage first-impression file passes 19 of 20 individual cases locally, including the skip target, book-first layout, approved artwork, and sample labels.
- Existing safe mocked-provider tests cover signup consent, resource delivery responses and email payloads, conversion-event payloads, payment/webhook handling, and consent/approval-gated reviews. No real customer or payment data was used.
- Source and rendered/API checks confirm that book-sample signup and delivery email share `/book/sample/read`, and old signed PDF links remain valid. The browser-opening context remains consistent.
- The visual tooling now requests desktop 1440px, tablet 768px, and phone 390px screenshots plus JSON diagnostics for horizontal overflow, loaded fonts, computed footer font, and skip-link focus. Syntax and lint checks pass.

### Failed local checks and resolved failures

- An initial full local run reported 81/87 test files passing. Five initially failing files pass after final-build/focused reruns; the remaining local failure is the homepage font self-hosting assertion. Blocked font downloads make the local build emit Google Fonts fallback links. The same assertion passes in GitHub CI. It was not weakened or skipped.
- Earlier missing-dependency/build failures were resolved through the offline npm cache, source/asset recovery, and bundled Node 24 runtime. They are not counted as product failures.
- No application test failure remains in the completed GitHub job. Browser/provider evidence below is still incomplete.

### Unverified

- Desktop, tablet, and phone screenshot inspection; keyboard behavior in an actual browser; computed footer font; responsive card/spacing/background rendering. The interactive browser host is unavailable. The initial visual snapshot job completed its build and page rendering but remained in artifact upload with no downloadable artifact; the tablet/diagnostics follow-up was queued. No responsive pass is claimed.
- Production tag network requests, opt-out changes, conversion-event receipt in analytics dashboards, and actual email inbox delivery. Local tests use synthetic data and mocked providers.
- Official ownership/current branding of non-GitHub social profiles. Existing social destinations were not changed.
- Live catalog/certification/reader HTTP checks: the web reader could retrieve the production homepage and privacy text, but returned access errors for these secondary pages. Local rendered routes and anchor tests are the available evidence.
- Authenticity of any individual customer's statement was not independently re-audited. The existing consent/approval/paid-order review pipeline and illustrative-sample labels remain; no fictional review was published.

Approval remains required before merging or deploying. Browser and live-provider checks above should be completed before release.
