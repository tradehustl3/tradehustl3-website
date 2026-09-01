import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, FACILITIES_MAINTENANCE_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(FACILITIES_MAINTENANCE_LANDING);

export default function FacilitiesMaintenanceResumeBuilderPage() {
  return <TradeLandingPage content={FACILITIES_MAINTENANCE_LANDING} />;
}
