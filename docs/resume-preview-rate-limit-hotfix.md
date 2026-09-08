# Resume preview rate-limit hotfix

This launch-safety hotfix addresses production lockouts reported by legitimate prospects before the $9.99 resume purchase step.

## Behavior

- Keeps the original 10/day per-user, 20/day per-IP, and configurable global AI attempt controls unchanged.
- Expands the unpaid prospect-facing tolerance from an effective 3/day user limit to 6/day and from 6/day IP limit to 20/day.
- Failed generation responses refund only the unpaid prospect-facing counters; the broader user/IP/global attempt counters still record the attempt for cost/abuse protection.
- Requests rejected before AI generation refund the counters they incremented so repeated blocked clicks do not push the counters farther away from recovery.
- Rate-limit responses include a distinct `rateLimitReason` and customer-safe copy instead of reporting every condition as a generic daily outage.

The implementation is intentionally contained in the resume-builder wrapper so the proven base entitlement, payment, correction, generation, and storage logic remains unchanged during the launch hotfix.
