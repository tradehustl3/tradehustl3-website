import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, WELDING_FABRICATION_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(WELDING_FABRICATION_LANDING);

export default function WeldingFabricationResumeBuilderPage() {
  return <TradeLandingPage content={WELDING_FABRICATION_LANDING} />;
}
