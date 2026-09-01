import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata, PLUMBING_LANDING } from "../trade-landing-content";

export const metadata: Metadata = buildTradeLandingMetadata(PLUMBING_LANDING);

export default function PlumbingResumeBuilderPage() {
  return <TradeLandingPage content={PLUMBING_LANDING} />;
}
