import type { MetadataRoute } from "next";
import { SITE_URL } from "./site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // No `host`: the Host directive is non-standard and ignored by Google;
    // the canonical origin is enforced by the www/HTTP 301 redirects.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
