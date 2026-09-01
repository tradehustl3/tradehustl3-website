import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, HVAC_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(HVAC_LANDING);

export default function HvacResumeBuilderPage() {
  return <TradeLandingPage content={HVAC_LANDING} />;
}
