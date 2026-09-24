import { Inter } from "next/font/google";

/**
 * The single Resume Builder typeface (UI Design System — Approved September 2026).
 * Exposed as `--font-rb`; resume-builder.css reads it through `--rb-font`.
 * The homepage account panel imports it too so the entry step matches the builder.
 */
export const rbFont = Inter({
  subsets: ["latin"],
  variable: "--font-rb",
  display: "swap",
});
