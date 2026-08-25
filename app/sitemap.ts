import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
  ];
}
