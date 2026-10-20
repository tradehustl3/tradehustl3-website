import type { Metadata } from "next";
import { TradeLandingPage } from "../trade-landing";
import { buildTradeLandingMetadata } from "../trade-landing-content";
import { HEAVY_EQUIPMENT_OPERATOR_LANDING } from "../heavy-equipment-content";

export const metadata: Metadata = buildTradeLandingMetadata(HEAVY_EQUIPMENT_OPERATOR_LANDING);

export default function HeavyEquipmentOperatorResumeBuilderPage() {
  return <TradeLandingPage content={HEAVY_EQUIPMENT_OPERATOR_LANDING} />;
}
