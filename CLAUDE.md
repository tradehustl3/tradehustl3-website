# TRADE HUSTL3 website: design system rules

Read this before you build UI in this repo, including UI built from a Figma design. It tells you where colors, type,
spacing, components, icons and images live, and which rules apply to which part of the site.

The site does **not** have one design system. It has several *surfaces*, and each one has its own palette, fonts and
approval history. Find the surface you are working on first, then follow that surface's rules. Don't move one surface's
look onto another.

---

## 1. Stack and frameworks

- **Framework:** [vinext](https://www.npmjs.com/package/vinext), the Next.js App Router API on Vite, deployed to a
  Cloudflare Worker. Write normal Next.js code: `app/` routes, `layout.tsx`, `metadata`, `next/link`, `next/image` and
  `next/font/google` all work. React 19, TypeScript strict, path alias `@/*` points to the repo root.
- **Styling:** plain CSS. The site uses **CSS Modules** (`*.module.css`, imported as `styles`) for components and pages,
  plus a few **scoped global stylesheets** (listed in section 4).
- **Tailwind v4** is imported once, in `app/globals.css` (`@import 'tailwindcss'`). That gives the site Tailwind's
  preflight reset. **No component uses Tailwind utility classes** (the `sr-only` class is defined by hand in
  `globals.css`). Don't add utility classes (`flex`, `px-4`, `md:grid` and so on). Write the CSS in the module.
- **Backend:** `worker/` holds the Cloudflare Worker: API routes, D1, R2, Stripe, Brevo, AI generation, and PDF/DOCX
  resume rendering. Figma UI work should not touch `worker/`.
- **No UI library and no icon library.** Every component is hand-written in `app/`.

### Commands

```bash
npm run dev         # Vite dev server
npm run lint        # ESLint: next core-web-vitals, react, react-hooks, jsx-a11y, typescript-eslint
npm run typecheck   # tsc --noEmit
npm test            # runs `npm run build`, then node:test over tests/*.test.{mjs,ts}
```

CI (`.github/workflows/test.yml`) runs `npm audit`, lint, typecheck, test and the Worker size check
(`tools/pr186/check-worker-size.mjs`). Many tests render HTML and assert on class names, copy, image paths, alt text
and font self-hosting. When you change markup, run `npm test`, and update an assertion only when the change was
intended. `visual-snapshot.yml` screenshots `/` and `/book` on pull requests.

---

## 2. Project structure

```
app/                         Routes and UI. Shared homepage/site components sit flat in app/ (home-*.tsx + .module.css)
  layout.tsx                 Root layout: Anton (--font-display) and Space Grotesk (--font-body), globals.css,
                             mobile-header-tune.css, proof-section-enhance.css, analytics, JSON-LD
  page.tsx                   Homepage (hub). Adds the Barlow fonts and rb-foundation.css for the account panel
  site.ts                    SITE_URL, titles, descriptions, OG image and logo paths. Reuse these constants
  resume-builder/            Resume Builder app (paid product). Own layout, font, tokens and CSS
  book/  top-10-trades/  resources/  resume-examples/  reviews/  privacy/ terms/ contact/ data-deletion/ ...
worker/                      Cloudflare Worker (APIs, resume PDF/DOCX generation, payments)
public/                      Served assets (see section 6)
brand/                       Brand master files. NOT served; web copies live in public/
tools/brand/                 Asset build scripts + tool-silhouettes.json (the source of the tool icons)
docs/brand/, docs/briefs/    Approved design specs (see section 3)
docs/resume-builder-phase2-spec.md   Resume Builder UI Design System (source of truth for RB screens)
tests/                       node:test suites (rendered-HTML, assets, behavior)
```

File naming: kebab-case. A component and its styles share a name (`conversion-cta.tsx` + `conversion-cta.module.css`).
A page's data or copy goes in a sibling `*-data.ts` or `*-content.ts` file (`home-hub-stages-data.ts`,
`trade-landing-content.ts`). Components are named exports in PascalCase. Pages are default exports.

---

## 3. Surfaces: pick one before you write CSS

| Surface | Routes | Fonts | Tokens / styles | Approved spec |
| --- | --- | --- | --- | --- |
| **Resume Builder UI** | `/resume-builder/**`, `/resume-examples/**`, and the homepage account panel (`.rb-scope`) | Inter (`--font-rb` → `--rb-font`) | `--rb-*` in `app/resume-builder/rb-foundation.css`; layouts in `resume-builder.css`, `trade-landing.module.css` | `docs/resume-builder-phase2-spec.md`, "UI Design System — Approved September 2026" |
| **Homepage / hub** | `/`, `/resources/**` | Barlow Condensed 700/800 (`--font-home-display`), Barlow 400–700 (`--font-home-body`) from `app/home-fonts.ts` | Module-local tokens (`--navy`, `--cream`, `--gold`, `--red`, `--hub-*`, `--cta-*`) | `docs/brand/TRADE_HUSTL3_CONVERSION_DESIGN_SYSTEM.md`, `docs/briefs/homepage-first-impression-brief.md` |
| **Content shell** | `/book`, `/book/order-confirmed`, policy pages (`PolicyPage`) | Anton (`--font-display`), Space Grotesk (`--font-body`) | `app/page-shell.css`, scoped to `.book-page` / `.policy-page` / `.order-confirmed-page` | none (legacy dark navy / cream look) |
| **Standalone content pages** | `/top-10-trades`, `/book/sample`, `/reviews` | Anton + Space Grotesk | Each page's own `page.module.css` with local tokens | none |
| **Generated resume documents** | PDF, DOCX, preview files | Arimo/Arial, Carlito/Calibri, Gelasio/Georgia | `worker/resume-templates.ts`, `worker/resume-layout-v2.ts`, `worker/resume-documents.ts` | `docs/resume-builder-phase2-spec.md` "Approved behavior" |

**Generated resume documents are not web UI.** Figma work on the Resume Builder *interface* must not change the
templates, fonts, accent colors or pagination in `worker/`. Template work is product work. It must keep PDF/DOCX
parity, stay ATS-readable, and keep the three templates (`plain` Field Pro, `navy` Modern Trade,
`lead` Lead / Supervisor) structurally different: header architecture, section order, skills layout. Changing colors
alone does not make a new template.

---

## 4. Design tokens

Tokens are **CSS custom properties**. There is no JSON token file, no Tailwind theme, and no token build step.

### 4.1 Resume Builder (`app/resume-builder/rb-foundation.css`): the strictest system

Defined on `.rb-page` (every builder `<main>`) and `.rb-scope` (builder UI rendered elsewhere).

```
Brand     --rb-navy #0F2D5B  --rb-navy-hover #0B2248  --rb-red #D71920  --rb-red-hover #B8141A
          --rb-red-soft #FEF2F2  --rb-red-border #FECACA
Status    --rb-error #B91C1C  --rb-success #15803D (+ -soft #F0FDF4, -border #BBF7D0)
          --rb-warning #A16207 (+ -soft #FFFBEB, -border #FDE68A)  ("Action needed" badges only)
Surfaces  --rb-bg #FAFAFB  --rb-surface #FFF  --rb-soft #F8FAFC
Text      --rb-text #0F172A  --rb-text-2 #64748B  --rb-muted #94A3B8 (decorative/placeholder only, fails 4.5:1)
Borders   --rb-border #E5E7EB  --rb-border-strong #CBD5E1
Radius    --rb-radius-sm 8px  --rb-radius 10px  --rb-radius-lg 12px
Shadow    --rb-shadow-sm  --rb-shadow  --rb-shadow-lg  --rb-focus-ring
Layout    --rb-container 1240px  --rb-gutter clamp(16px, 4vw, 32px)  --rb-control-h 48px
Type      --rb-font (Inter → system UI stack)
```

Rules (from the approved spec):
- Use `var(--rb-*)` in Resume Builder styles. **Never use raw hex values.** `resume-builder.css` still has some
  legacy hex literals. Don't add more, and replace them with tokens when you touch those rules.
- New shared primitives go in `rb-foundation.css`. Don't copy button or field CSS into page modules.
- Don't bring back dark full-page backgrounds, cream form surfaces, gold accents, condensed or display fonts, or
  uppercase buttons in the builder.
- Type: H1 800 `clamp(30px, …, 46px)`, H2 700 24→30px, H3 700 18–20px, body 16px/1.55, labels 14px/600, helper text
  13–14px. Use sentence case. Uppercase only for `.rb-kicker` eyebrows (12px/700/0.08em).

### 4.2 Homepage / hub

Tokens are declared **inside each CSS module** (for example at the top of `home-hub.module.css`,
`home-pathway.module.css`, `home-storefront.module.css` and `resources.module.css`). The approved values are:

| Role | Value | Notes |
| --- | --- | --- |
| Page navy | `#02142B` (`--navy-deep`) / storefront canvas `#071C30` (`--hub-navy`, `--cta-navy`) | |
| Section navy / ink | `#0B1F33` (`--navy`), `#081E32` (`--hub-ink`, `--cta-ink`) | |
| Cream | `#F3ECDF` (`--cream`) | Trade-picker buttons, light grounds |
| Brand red | `#D71920` (`--red`); hub accent red `#BA2028` (`--hub-red`); hero buttons `#D7261C`, headline accent `#FF4A3D` | |
| Gold | `#F1C357` (`--gold`), CTA gold `#F3C367` (`--cta-gold`, hover `#FFDA8D`), eyebrow gold `#D4A63A` | **Gold `#D4A63A` only on navy, never on white** |
| Dark gold on white | `#7A5408` | |
| Supporting text on navy | `#DBE4EB` (`--cta-supporting`) | |
| Soft ink / lines | `--ink-soft #3D4F60`, `--line #D8D0BF`, `--sky #D8E6F1`, blueprint lines `#8EC0F0` | |

Changing the official palette needs **owner approval** (see the conversion design system doc). Don't create new
brand colors to match a Figma frame. Map the frame's colors to the nearest approved token, and flag any color that
has no match.

### 4.3 Content shell and legacy globals

- `app/page-shell.css`: `--navy #071A2B`, `--red #D9361E`, `--gold #D6A52A`, `--cream #F4F0E7`, `--charcoal`,
  `--muted`.
- `app/globals.css` `:root`: `--red #D71920`, `--gold #F5B942`, `--ink #102F76`, `--panel #2456A8`,
  `--panel-deep #081E50`, `--steel #C5D7F5`. These are legacy site-wide values. Don't use them in new work. Prefer the
  surface tokens above.

### 4.4 Known debt (don't copy)

The same role has drifted to slightly different hex values across files (several golds, several navies), and most
homepage and content modules use hex literals instead of their own local variables. When you build from Figma:
- Reuse the variables the module already declares. If the module has none, declare the approved values as local
  custom properties at the top of the module, the same way `home-hub.module.css` does. Don't scatter literals.
- Don't add a global token file or move tokens between surfaces as a side effect of a design task. That is a separate
  refactor that needs approval.

---

## 5. Components

### Shared components to reuse

| Need | Component | File |
| --- | --- | --- |
| Marketing / hub call to action (link or button) | `ConversionCta` (`variant`: `primary` \| `resource` \| `secondary` \| `format`; `loading`) | `app/conversion-cta.tsx` + `.module.css` |
| Brand logo lockup (TH3 mark + "ENTER • EARN • ELEVATE") | `BrandLockup` (`size`: `sm` \| `md` \| `lg`) | `app/brand-lockup.tsx` |
| Resume Builder header | `ResumeBuilderHeader` (`action` slot) | `app/resume-builder/resume-builder-header.tsx` |
| Resume Builder progress | `FlowSteps` (`current` 1–5) | `app/resume-builder/flow-steps.tsx` |
| Resume Builder primitives | `.rb-button(-primary/-secondary)`, `.rb-field`, `.rb-field-grid`, `.rb-alert(-info/-success)`, `.rb-kicker`, `.rb-check`, `.rb-text-link`, `.rb-sr-only` | `app/resume-builder/rb-foundation.css` |
| Trade landing pages | `TradeLandingPage` + content objects in `trade-landing-content.ts` | `app/resume-builder/trade-landing.tsx` |
| Policy / legal page | `PolicyPage`, `PolicySection` | `app/policy-page.tsx` |
| Resource Center chrome | `ResourceHeader`, `ResourceFooter` | `app/resources/resource-chrome.tsx` |
| Email capture | `SignupForm`, `ResourceForm` | `app/signup-form.tsx`, `app/resource-form.tsx` |
| Social icons | `SocialLinks` (two copies today: `app/social-links.tsx` for `/book`, a local one in `app/footer-enhancements.tsx` for the site footer; consolidate before adding a third) | `app/social-links.tsx` |
| Tool icons / dividers | `ToolSilhouette`, `ToolRail` | `app/tool-silhouettes.tsx` |
| HUSTL3 BOT guidance rail | `Hustl3Bot` | `app/resume-builder/hustl3-bot.tsx` |
| Verified reviews | `CustomerReviews` (renders nothing when there are no approved reviews) | `app/customer-reviews.tsx` |

Before you write a new component, search `app/` for one that already does the job. Two buttons that look the same
should be the same component.

### Component conventions

- Use server components by default. Add `'use client'` only for state or browser APIs (the CTA's pressed state, the
  wizard, analytics).
- Use native semantics: `<button>` for actions, `<Link>` for internal navigation, `<a>` for external links. Use real
  `<button aria-pressed>` or `role="radio"` + `aria-checked` for pickers. Selection must never rely on color alone.
- Decorative glyphs and arrows are `aria-hidden="true"`. The visible label carries the meaning.
- Interactive pickers must work without JavaScript. Server-render the default state and add interactivity as
  progressive enhancement (see the homepage trade picker and `?trade=` handling in
  `app/resume-builder/trade-preselect.ts`).
- Variants use a `data-*` attribute or a variant class from the module (`data-size`, `data-tone`, `styles[variant]`).
- **Analytics:** `CtaAnalytics` (`app/cta-analytics.tsx`) is the only delegated click listener. Components render
  `data-*` metadata and don't send events themselves. Keep existing `offer_id` / `placement` values. Never put PII,
  tokens or signed URLs in event data.

---

## 6. Assets and images

- Served files live in **`public/`**. Masters live in `brand/` and are never served.
- `next.config.ts` sets `images.unoptimized: true`, so **`next/image` does not resize or compress anything.** Every
  image must already be web-ready when you commit it:
  - Put it in `public/optimized/` (or `public/trade-landings/`, `public/optimized/atmosphere/`) as **WebP**
    (AVIF is OK). Use JPEG only for OG/share images.
  - Size it close to its display size. Use a new filename for a new version (`-v2`, `-v3`) instead of overwriting, so
    cached copies don't go stale.
  - Pass `width` and `height` (or a sized container) so the page doesn't shift as images load. Use `priority` only
    for above-the-fold images.
  - Write descriptive `alt` text. Decorative images get `alt=""`.
- Byte budgets are enforced by tests: `tests/brand-icons.test.mjs` (logos, favicons, patterns) and
  `tests/homepage-atmosphere.test.mjs` (homepage backgrounds < 150 KB in total). Don't commit the 2.6 MB logo PNG
  anywhere it would ship to visitors.
- Logos:
  - TH3 header mark: `/optimized/th3-logo-header.webp`, used through `BrandLockup`. Don't place it by hand.
  - TH3 512px logo: `/optimized/th3-logo-512.webp` (`BRAND_LOGO_512` in `site.ts`).
  - Resume Builder badge: `/optimized/resume-builder-logo-512.webp` and `-header.webp`.
  - Favicons and app icons are already in `public/`. Don't regenerate them.
- Book cover: `/optimized/book-cover-v2.webp` (matches `brand/trade-hustl3-book-cover-final-wrap.pdf`).
- Worksite photography: `public/trade-landings/*.webp`, mapped per trade in
  `app/resume-builder/trade-worksite-images.ts`. Reuse that mapping.
- **Figma asset exports:** don't link to Figma-hosted image URLs. Download the asset, convert it to WebP at display
  size, commit it under `public/optimized/`, and reference it by root path (`/optimized/...`). Don't add placeholder
  images or invent people, testimonials or logos that the design shows as placeholders.
- Fonts: load them only through `next/font/google` (self-hosted at build time). **No runtime requests to Google
  Fonts**; a test checks this. Resume document fonts are subset into `worker/fonts/` and are separate from web fonts.

---

## 7. Icons

- There is **no icon package**. Icons are **inline SVG** in JSX.
  - UI icons: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="1.8"`, round caps and
    joins (see the upload icon in `app/resume-builder/intake/wizard.tsx`). Color comes from the CSS `color` property.
  - Brand and social glyphs: filled 24×24 paths (`app/social-links.tsx`).
  - Trade tool art: `ToolSilhouette` (`viewBox 0 0 64 64`, `fill="currentColor"`). The shapes are defined in
    `tools/brand/tool-silhouettes.json`, and `tools/brand/build-tool-patterns.py` turns them into the background tiles
    in `public/brand/`. Add new tool shapes to the JSON. Don't paste them into components.
- Decorative SVGs get `aria-hidden="true"` (plus `focusable="false"`). An icon-only control needs an accessible name
  (`aria-label` or an `sr-only` span).
- Don't add an icon library to match a Figma frame. Export the icon from Figma as SVG, simplify it, and inline it using
  the conventions above.
- Text glyphs (`→`, `↗`, `✓`) are used for CTA arrows and progress checks, always `aria-hidden`.

---

## 8. Styling rules

- **Scope everything.** A CSS module goes with each component or page. Global stylesheets are scoped to a root class
  (`.rb-page`, `.rb-scope`, `.book-page`, `.policy-page`). Don't add unscoped element selectors in a new global file.
  `globals.css` already has many legacy global rules, so check the result for cascade surprises.
- Don't use inline `style={{…}}` for visual design. Use the module. Inline style is fine for `display: contents`
  wrappers or values computed at runtime.
- **Responsive:** design mobile-first. The site's common max-width breakpoints are 380, 640, 720, 900/960 and
  1050/1100px. Use the surface's container (`--rb-container` 1240px, `--hub-width` 1280px) and its gutter
  (`--rb-gutter`, `--hub-gutter`). Use `minmax(0, 1fr)` in grids so long words never cause overflow. There must be no
  horizontal scroll at 320/375/390/430/768/1024/1280/1440px.
- **Spacing and type scale:** use `clamp()` for fluid section spacing and headings, as the existing modules do. There is
  no spacing scale token. Match the spacing of nearby sections rather than copying Figma pixel values exactly.
- **Motion:** only on interaction (hover lift ≈2px, arrow nudge ≈3px), gated to precise pointers. Every animation
  needs a `@media (prefers-reduced-motion: reduce)` override.
- **Accessibility (enforced in review and by `eslint-plugin-jsx-a11y`):**
  - Text contrast ≥ 4.5:1 (≥ 3:1 for large text, control borders and focus rings). Check every color pairing the Figma
    frame uses.
  - Visible `:focus-visible` on every interactive element: navy outline on Resume Builder surfaces, white ring with a
    gold surround on navy hub surfaces.
  - Touch targets ≥ 44px. Resume Builder controls are 48px and marketing CTAs 52px.
  - Inputs are ≥ 16px text (prevents iOS zoom). Labels stay visible. Status and error messages use live regions.
  - Must work at 200% zoom and in forced-colors mode.

---

## 9. Figma → code workflow

1. Open the frame with the Figma MCP tools (`get_design_context`, `get_screenshot`, `get_variable_defs`). Treat the
   generated code as a **reference only**. It usually comes out as React + Tailwind, and this repo doesn't use Tailwind
   utilities.
2. Decide which **surface** (section 3) the frame belongs to and load that surface's tokens and spec.
3. Map Figma variables and colors to existing tokens. Map text styles to the surface's font variables. List anything
   that doesn't map and ask the owner. Don't invent tokens.
4. Reuse components from section 5. Write new CSS in a co-located `*.module.css` using the surface's variables.
5. Handle assets as described in section 6 and icons as described in section 7.
6. Keep existing copy, routes, anchors, analytics attributes and test-asserted markup unless the task says to change
   them. Don't add fabricated testimonials, sales counts, income or employment guarantees, or countdown pressure.
7. Check at phone and desktop widths, run `npm run lint && npm run typecheck && npm test`, and report the results.

## 10. Product guardrails that affect UI

- Resume Builder is a paid product. Don't change checkout, entitlements, Stripe, generation or correction accounting
  in a design task.
- Changing a template or a safe presentation setting (font, size, spacing, accent) must not use up an AI correction.
- Resume content must stay grounded in facts the customer gave. UI copy and examples must not suggest that the product
  invents experience. Example resumes are labeled as fictional.
- Owner approval is needed for: official palette changes, production deploys, and live analytics, Meta, Brevo, Stripe
  or Cloudflare configuration changes.
- Work on a focused branch. Don't merge or deploy unless asked.
