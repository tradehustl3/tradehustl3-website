# TRADE HUSTL3 Brand & Conversion Button Kit V1

## Scope and brand assets

The approved homepage has five chapters in this order.

1. TRADE HUSTL3 Book
2. TRADE HUSTL3 Resume Builder
3. Find Your Lane
4. Top 10 Trades 2026–2027 Guide Preview
5. Join the Movement and footer

Use the official TH3 logo, final book cover, Resume Builder badge, guide artwork, and labeled illustrative resume already checked into the project. Preserve existing headings, author credit, narrative, gold book-to-resume divider, routes, anchors, and campaign-specific resume pages. Primary readers include students and young adults aged approximately 16–25. Copy must also be understandable to parents, educators, and experienced workers.

## Color tokens

The existing approved homepage palette takes precedence over the newly proposed alternatives. V1 retains these colors, including the existing navy canvas.

| Role | V1 value | Proposed alternative | Decision |
| --- | --- | --- | --- |
| Navy canvas | `#071C30` | `#111B2D` | Retain approved canvas |
| Gold action | `#F3C367` | `#E7B64C` | Retain approved gold |
| Button text | `#081E32` | Navy | Retain existing dark ink |
| Primary text | `#FFFFFF` | `#FFFFFF` | Same value |
| Supporting text | `#DBE4EB` | `#CDD8E6` | Retain approved supporting text |
| Restrained red | `#BA2028` | Existing brand red | Error and small brand accents |
| Gold hover | `#FFDA8D` | — | Existing highlight |
| Gold shadow | `#916629` | — | Action depth |
| Disabled surface | `#34465A` | — | Clear inactive state |

The shared component exposes `--cta-navy`, `--cta-ink`, `--cta-gold`, `--cta-gold-highlight`, `--cta-white`, and `--cta-supporting` within its CSS scope. Supporting interaction colors do not replace logo or artwork colors. Changing the official palette requires owner approval.

## Typography and composition

Keep the existing self-hosted Barlow Condensed display face and Barlow body face. Display typography establishes product identity. Button labels use Barlow at 800 weight, sentence-style capitalization, approximately 15–17px, and 1.35 line height. Labels wrap naturally on narrow screens and under text zoom. Preserve body copy and product imagery. Keep one prominent action per offer, comfortable spacing around it, and a clear relationship between an action and its supporting explanation.

## Shared CTA component

`app/conversion-cta.tsx` and `app/conversion-cta.module.css` define four variants.

| Variant | Use | Appearance |
| --- | --- | --- |
| `primary` | Reveal a flow or enter the builder | Gold finish, navy text, restrained depth |
| `resource` | Submit a resource request or explicit subscription | Same hierarchy, full form width |
| `secondary` | Supporting navigation such as the header sample link | Gold outline, white text |
| `format` | Paperback, Kindle, Direct PDF | Understated underlined link, 44px touch height |

Use native buttons for actions and semantic links for navigation. Internal links use Next navigation. External format links use the canonical values in `app/book/editions.ts`. A decorative arrow communicates progression. It is hidden from assistive technology, and the visible label carries the meaning. Button controls are 52px minimum height with 10px corners and comfortable padding. Primary and resource actions fill their available width on small screens. Format links remain compact and wrap with their separators.

Hover lifts an enabled action by 2px and moves its arrow by 3px on devices with a precise pointer. Pressing lowers the control and reduces its shadow. Shared primary-pointer feedback covers touch, clears on release/cancel/leave/blur, and complements native keyboard activation. Disabled controls use a distinct surface and text color. Loading submission buttons expose `aria-busy`, show a textual sending state, and are disabled while the request is in flight. Motion occurs only during interaction. Reduced-motion mode removes transitions and transforms while retaining color and focus feedback.

## Approved offer copy and behavior

| Offer | Main action | Explanation |
| --- | --- | --- |
| Book | Get Your 7 FREE Pages | Email address required for the free seven-page sample |
| Resume Builder | Start Your Free Resume Preview | See your preview before you pay · $9.99 one-time to unlock |
| Trades guide | Get Your FREE Trades Guide Preview | Six-page preview featuring power-line and HVAC profiles, national pay context, and practical next steps |
| Newsletter | Subscribe | Explicit request for optional TRADE HUSTL3 marketing updates |

The book action reveals the existing email form and moves focus into it. Paperback, Kindle, and Direct PDF links sit directly below the initial action. The builder action enters `/resume-builder/start` and its existing verified-account flow. The homepage does not embed another account form. Successful resource requests expose the existing protected PDF route. The book also provides its existing browser reader. After submission, the PDF is the primary action and the browser reader is secondary. The header sample link is outlined. The hub uses its section actions without a repeated floating book CTA; campaign sticky behavior is retained.

Explain immediate access, email delivery, and marketing subscription separately. Homepage resource requests send `marketingConsent: false`. The Worker records and fulfills the request while skipping marketing contact synchronization and its retry queue. The newsletter explicitly sends `marketingConsent: true` and keeps the existing Brevo confirmation behavior. Existing callers that omit this field retain their API contract. Receipt of a resource alone does not imply marketing consent. No preselected marketing checkbox or automatic signup is added.

Use concrete benefits and accurate asset descriptions. Avoid fabricated testimonials, sales counts, guaranteed employment or income, deadline pressure, countdowns, or claims that the preview contains ten complete profiles. Preserve the seven-page book sample versus six-page trades-preview distinction. Keep the book title and author credit exact. Resource access must not require a purchase.

## Accessibility

Maintain at least 4.5:1 contrast for normal text, 3:1 for large text, and 3:1 for control boundaries and focus indicators. Gold with the existing navy ink exceeds the normal-text requirement. Controls have visible keyboard focus with a white ring and gold surround. Preserve native Enter and Space behavior, native disabled behavior, meaningful link destinations, descriptive labels, and logical focus order. Form labels remain visible, inputs use email autocomplete, and success/error messages use a live status region. Successful submissions move focus to the status only when focus was still within the submitted form. Avoid hiding information behind hover. Verify at 320px, desktop widths, and 200% zoom. Support forced colors and reduced motion.

## Analytics and consent

`CtaAnalytics` is the single delegated click listener. Shared components render metadata and do not send click events themselves. Resource submission emits its existing accepted-request event once per form instance. Trackers honor the existing optional-tracking preference and Global Privacy Control.

| Event | Actual trigger and meaning | Identifiers |
| --- | --- | --- |
| `cta_view` | At least 50% of a marked primary control visible for one continuous second in the foreground, once per offer and placement for the mounted page | `offer_id`, `placement`, `item`, `location`, fixed `destination` |
| `cta_click` | Click on an instrumented action or purchase-format link | Same identifiers for homepage offers |
| `form_start` | First focus within a resource form | `content_name`, `signup_source`, `offer_id`, `placement` |
| `generate_lead` | `/api/subscribe` returns a successful accepted request | Same form identifiers; acceptance can precede email delivery |
| Meta `Lead` | Companion to accepted `generate_lead` | Same form identifiers |
| `resource_open` | Click on the returned PDF link or browser-reader link | Fixed `resource_pdf` or `resource_reader` destination; offer and placement |
| `resume_builder_start` | Existing builder-entry visibility or dedicated/campaign page mount | Existing first-party funnel schema |
| `resume_preview_generated` | Existing successful generation milestone | Existing consent-controlled funnel schema |
| `begin_checkout` | Existing successful checkout creation | Existing funnel schema |
| GA4 `purchase` | Existing Resume Builder verified Stripe webhook | Existing transaction and amount schema |

Homepage offer identifiers are `book_sample`, `resume_builder`, `top_10_trades`, and `newsletter`. Placements include `homepage_book_hero`, `homepage_book_preview`, `homepage_book_formats`, `homepage_resume_builder`, `homepage_top_10_guide`, and `homepage_newsletter`. Format items retain `amazon-paperback`, `amazon-kindle`, and `direct-ebook` under the `the_book` offer.

`resource_open` measures access intent. Authorization is enforced by the existing signed token/cookie PDF handlers and checked in regression tests. It does not report a confirmed download or prove an authorized 200 response. The public browser reader has its existing access behavior. No new authorized-access event is asserted. Amazon and direct PDF clicks remain outbound intent. The direct eBook fulfillment webhook is separate from the Resume Builder GA4 purchase sender.

Never include email, names, uploaded resume content, authentication codes, signed URLs, access tokens, arbitrary query strings, or other personal data in offer events. Do not attach raw UTM values to new homepage offer events. Keep GA4 key-event settings and Meta/Brevo/Stripe/Cloudflare configuration changes outside this local implementation. Owner approval is needed for official palette changes, production publication, or live analytics configuration changes. Verify live receipt and email delivery through the owner's release process.
