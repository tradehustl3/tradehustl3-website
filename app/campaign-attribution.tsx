"use client";

import { useEffect } from "react";

const STORAGE_KEY = "tradehustl3_campaign_attribution";
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type CampaignAttribution = Partial<Record<(typeof KEYS)[number], string>>;

export function readCampaignAttribution(): CampaignAttribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as CampaignAttribution;
  } catch {
    return {};
  }
}

export function CampaignAttributionTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next: CampaignAttribution = {};

    for (const key of KEYS) {
      const value = params.get(key)?.trim();
      if (value) next[key] = value.slice(0, 120);
    }

    if (Object.keys(next).length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  return null;
}
