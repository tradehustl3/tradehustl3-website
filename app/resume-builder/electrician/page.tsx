import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, ELECTRICIAN_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(ELECTRICIAN_LANDING);

export default function ElectricianResumeBuilderPage() {
  return <TradeLandingPage content={ELECTRICIAN_LANDING} />;
}
