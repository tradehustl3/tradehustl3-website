# HUSTL3 NEWS launch

The website adds `/news` and `/news/001-your-next-move`, connects the existing homepage signup to `THE HUSTL3 NEWS`, and links the community page to the archive. The removed `/join` signup box stays removed.

## Website behavior

- NEWS submissions require explicit marketing consent. They preserve the existing `INTEREST`, `SIGNUP_SOURCE`, and UTM attributes in Brevo.
- With `BREVO_DOI_TEMPLATE_ID` configured, the website requests confirmation; it does not send a welcome email or mark confirmation complete.
- Failed Brevo requests use the existing delivery queue. The response distinguishes queued and saved-only requests from a requested confirmation.
- The legacy D1 `subscribers.status = active` value records the signup request, not verified email ownership. Use confirmed Brevo list membership as the sending authority.

## Drafts

Regenerate the HTML, plain-text, and campaign settings with:

```sh
node --import tsx tools/news/render-email-drafts.ts
```

Files live in `emails/hustl3-news/`. Both messages contain a business mailing-address placeholder that must be replaced with the approved account footer. Neither message is scheduled. The issue and welcome link to the new website pages, which must be deployed before sending.

## Live account observations — November 22, 2026

- Existing Brevo automations 1 (Top 10 Trades) and 3 (seven-page sample) were active and left unchanged.
- A new welcome workflow, ID 4, was created from the welcome template. It remains **inactive and incompletely configured** under the default name “Welcome message.” Do not create a duplicate or activate its default email.
- The authorized test signup targeted `founder@tradehustl3.com` through the existing production homepage. Its response requested email confirmation.
- Brevo's transactional log showed the confirmation subject “Confirm your TRADE HUSTL3 subscription,” sender `updates@tradehustl3.com`, recipient `founder@tradehustl3.com`, and status Delivered. The owner reported no email received. Inbox delivery is **not verified**; no confirmation link was clicked.
- The connected Gmail account is a different address. A search across its folders found no messages from the signup sender after November 21. Forwarding from the founder mailbox has not been established.
- A NEWS welcome email and unsubscribe round trip have **not** been tested. No subscriber campaign was sent.

## Remaining account work

1. Resolve the founder mailbox's receiving/forwarding destination. Inspect the recipient-specific transaction details, mailbox Spam/Trash/quarantine and rules, and the domain's MX routing. Do not interpret Delivered as inbox placement or resend repeatedly.
2. Finish workflow 4: give it a NEWS-specific name; select the confirmed list (configured list ID 3) and filter `INTEREST = THE HUSTL3 NEWS`. Do not enroll guide-only subscribers or backfill existing contacts. Disable repeat entry.
3. Replace the default email with the welcome draft, set the approved sender and verified reply inbox, replace the postal-address placeholder, and remove or shorten the default two-day wait as appropriate.
4. Deploy the website, check article and email links, then complete the authorized confirmation, list-entry, welcome and unsubscribe test before activation.
5. Keep issue #001 unscheduled until the owner reviews and approves sending it to confirmed, subscribed NEWS contacts. Exclude unsubscribed and blocked contacts; use Brevo's unsubscribe link.

The first issue's credential note links to OSHA's official Outreach FAQ. It distinguishes an Outreach course completion card from a certification or license and makes no invented job, pay, or outcome claims.
