import type { MetadataRoute } from "next";
import { TRADE_LANDING_PAGES, tradeLandingPath } from "./resume-builder/trade-landing-content";
import { SITE_URL } from "./site";

const CONTENT_REFRESHED_AT = new Date("2026-08-30T23:27:04.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/book/sample`,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/top-10-trades`,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/resume-builder`,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...TRADE_LANDING_PAGES.map((page) => ({
      url: `${SITE_URL}${tradeLandingPath(page)}`,
      lastModified: CONTENT_REFRESHED_AT,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
  const policyPages = [
    "/privacy",
    "/terms",
    "/resume-builder/refund-policy",
    "/book/refund-policy",
    "/contact",
    "/data-deletion",
    "/resume-builder/ai-disclosure",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date("2026-08-25T00:00:00.000Z"),
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));
  return [...publicPages, ...policyPages];
}
