import {
  CREDENTIAL_KIND_LABELS,
  CREDENTIAL_REQUIREMENT_LABELS,
  TRADE_KEY_CREDENTIALS,
  credentialBySlug,
  type TradeFamilySlug,
} from "./credential-library";
import styles from "./resources.module.css";

/**
 * Original TRADE HUSTL3 trade icons (24×24, stroke). These are our own simple
 * line drawings — never an issuer's logo, seal, or card design.
 */
const TRADE_ICONS: Record<string, string> = {
  "hvac-refrigeration": "M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5",
  "electrical-low-voltage": "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  "plumbing-pipefitting": "M12 3C9 7.5 6 10.5 6 14.5a6 6 0 0 0 12 0C18 10.5 15 7.5 12 3z",
  "construction-carpentry": "M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M10 8V5h4v3",
  "facilities-property-apartment-maintenance": "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z",
  "welding-fabrication-machining": "M12 2c1 4 6 6.5 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 2.5-6.5C10 9 11 10.5 11 12",
  "general-labor-trade-helpers": "M18 2l4 4-3 3-4-4zM15 5 6.5 13.5M6.5 13.5 3 17l4 4 3.5-3.5zM9 16l-2-2",
  "commercial-driving-transportation": "M2 6h12v10H2zM14 9h4l4 4v3h-8M6 19a2 2 0 1 0 0-.01M18 19a2 2 0 1 0 0-.01",
  "warehouse-logistics-material-handling": "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9",
  "industrial-warehouse-maintenance": "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  "landscaping-grounds-maintenance": "M5 20c0-9 6-15 15-15 0 9-6 15-15 15zM5 20l9-9",
  "roadwork-paving-concrete-heavy-equipment": "M10 3h4l4.5 15h-13zM3 21h18M7.8 12h8.4",
  "roofing-exterior-trades": "M2 12 12 4l10 8M5 10v10h14V10M10 20v-5h4v5",
  "automotive-diesel-fleet-maintenance": "M3 13l2.2-5.5h13.6L21 13v5H3zM3 13h18M6.5 18v2.5M17.5 18v2.5M7 15.5h.01M17 15.5h.01",
};

export function TradeCredentialBadge({ tradeSlug }: { tradeSlug: TradeFamilySlug }) {
  const key = TRADE_KEY_CREDENTIALS[tradeSlug];
  const record = key ? credentialBySlug(key.credentialSlug) : undefined;
  if (!key || !record) return null;

  const kindLabel = CREDENTIAL_KIND_LABELS[record.kind];
  const requirementLabel = CREDENTIAL_REQUIREMENT_LABELS[record.requirement];

  return (
    <span
      className={styles.credBadge}
      data-kind={record.kind}
      role="img"
      aria-label={`Key credential: ${record.name} (${kindLabel}, ${requirementLabel})`}
    >
      <span className={styles.credBadgeIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={TRADE_ICONS[tradeSlug] ?? TRADE_ICONS["facilities-property-apartment-maintenance"]} />
        </svg>
      </span>
      <span className={styles.credBadgeText} aria-hidden="true">
        <span className={styles.credBadgeEyebrow}>Key credential · {kindLabel}</span>
        <span className={styles.credBadgeName}>{key.badgeLabel}</span>
        <span className={styles.credBadgeReq}>{requirementLabel}</span>
      </span>
    </span>
  );
}
