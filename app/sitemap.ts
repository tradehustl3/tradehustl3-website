import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date("2026-08-21T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: new Date("2026-08-21T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/resume-builder`,
      lastModified: new Date("2026-08-24T00:00:00.000Z"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/top-10-trades`,
      lastModified: new Date("2026-08-29T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/book/sample`,
      lastModified: new Date("2026-08-29T00:00:00.000Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
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
