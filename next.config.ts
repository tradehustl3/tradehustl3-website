import type { NextConfig } from "next";

const crawlerFreshnessHeaders = [
  { key: "Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-cache, max-age=0, must-revalidate" },
  { key: "X-TRADE-HUSTL3-Content-Revision", value: "2026-08-30-crawler-freshness" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/", headers: crawlerFreshnessHeaders },
      { source: "/book", headers: crawlerFreshnessHeaders },
      { source: "/book/sample", headers: crawlerFreshnessHeaders },
      { source: "/top-10-trades", headers: crawlerFreshnessHeaders },
      { source: "/resume-builder", headers: crawlerFreshnessHeaders },
    ];
  },
};

export default nextConfig;
