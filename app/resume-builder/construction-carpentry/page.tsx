import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, CONSTRUCTION_CARPENTRY_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(CONSTRUCTION_CARPENTRY_LANDING);

export default function ConstructionCarpentryResumeBuilderPage() {
  return <TradeLandingPage content={CONSTRUCTION_CARPENTRY_LANDING} />;
}
