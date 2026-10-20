# TRADE HUSTL3 — Homepage first impression (approved mockup)

Reference: `homepage-mockup-reference.html` in this folder is the approved mockup (desktop + phone).
It is a design reference, not code to paste. Rebuild it in the existing Next.js homepage (`app/page.tsx`,
`app/home.module.css`) using the site's components and analytics links.

Branch: `feat/homepage-first-impression` from current main, in its own git worktree.
DRAFT PR only. No merge, no deploy.

## Scope (top of the homepage only)
1. **Header**: logo, three links (Trade examples, How it works, The Book), ONE red CTA "Build my free preview".
   Use the Resume Builder logo from the brand PR if merged; otherwise keep the current logo file.
2. **Hero**
   - Eyebrow: "RESUME BUILDER FOR THE SKILLED TRADES"
   - Headline: "Build {a/an} {trade} resume that looks ready for the job." The trade word is red.
   - Subtext: "Upload your resume or answer a few questions. HUSTL3 BOT turns your real experience into a clean, ATS-friendly resume. See the whole thing before you pay."
   - **Trade picker** "What's your trade?": HVAC, Electrical, Plumbing, Facilities, Welding, Construction.
     Real `<button aria-pressed>` elements, cream (#F3ECDF) with navy text; the selected one red (#D7261C) with white text.
     Selecting a trade updates the headline word, the example card and the CTA label
     ("Build my free {trade} preview"). The CTA links to `/?trade=<intake value>#resume-start` and must preselect
     that trade in the existing intake (reuse the trade-landing pages' existing `?trade=` handling; verify it).
     Default: no trade param → HVAC shown, CTA goes to plain `#resume-start`. Must work without JavaScript
     (server-render the default; the picker is progressive enhancement).
   - Price line: "$0 to preview · $9.99 once to unlock · No subscription · No credit card to start".
   - Example resume card (white) labeled "EXAMPLE" with the caption "Fictional example. Your resume uses only the facts you enter."
     Card content per trade comes from the mockup. Name "Jordan Taylor" matches the existing fictional cover-letter example.
3. **Promise band**: white with a light-blue blueprint grid (rgba(58,134,214,0.18) 1px lines every 22px) and
   3px #8EC0F0 lines top and bottom. Four items: See it first / Your facts only / Cover letter included / Built by a tradesman.
   Headings #7A5408, body #1E2A3A.
4. **How it works**: "Three steps. Preview before you pay." Three white blueprint-grid cards with 2px #8EC0F0 border,
   red numbers (#C81E14), navy titles, body text #7A5408.
5. **Reviews from verified buyers**: replaces "Real People. Real Results." (see below). White blueprint box.
   Render approved verified reviews from the existing `/api/resume-builder/reviews/public` endpoint;
   when there are none, show: "Only customers with a completed purchase can leave a review here. The first ones will appear as soon as they're approved." plus a "Build my free preview" button.

## Remove the unverified testimonials (separate commit)
Delete the six hard-coded `customerStories` in `app/customer-reviews.tsx` (Jessica M., David R., Taylor S.,
Michael T., Marcus K., Chris L.) and their images under `public/testimonials/`. Keep the verified-review fetch
and the product promises. Make this its own commit so it can be reviewed separately. Update any tests that
assert those names.

## Keep / don't touch
- Everything below the reviews section stays for now (catalog, cover-letter showcase, guide signup, closing CTA, footer).
  Remove only sections that duplicate the new hero/steps, and list each removal in the PR.
- No corrections wording anywhere in this change (pending the correction-window decision).
- Don't touch resume generation, checkout, Stripe, entitlements, the intake logic beyond reading `?trade=`.
- Keep all existing analytics events; add `select_content` (item = trade id) when a trade is picked.

## Colors and type
Navy #02142B (page), cream #F3ECDF, red #D7261C (buttons) / #FF4A3D (headline accent), gold #D4A63A (eyebrow on navy only),
dark gold #7A5408 (on white), light blue #8EC0F0 (lines). Display: Barlow Condensed 700/800; body: Barlow 400–700
(self-host or next/font; no new external requests at runtime if the site avoids them today).

## Quality bar
- Contrast: all text ≥ 4.5:1 (large headline ≥ 3:1). Gold #D4A63A is never used on white.
- Touch targets ≥ 44px. Keyboard: trade buttons reachable and operable with Tab/Enter/Space; visible focus ring.
- Phone (390px): header wraps, hero stacks, example card below the CTA, no horizontal scroll.
- No layout shift on load (reserve the example card's size). Lighthouse performance not worse than main.

## Verify and report
Run lint, typecheck, build and the full test suite. Add tests for: trade picker updates the headline and CTA href;
default render without a trade; reviews empty state; no hard-coded testimonial names remain.
Screenshots at 1440px and 390px, before and after, plus the Cloudflare preview link.
Report PLANNED / CODED / TESTED / PUSHED with SHAs and the PR number.
