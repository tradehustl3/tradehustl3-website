import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, GENERAL_LABOR_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(GENERAL_LABOR_LANDING);

export default function GeneralLaborResumeBuilderPage() {
  return <TradeLandingPage content={GENERAL_LABOR_LANDING} />;
}
