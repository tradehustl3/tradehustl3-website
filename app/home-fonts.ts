import { Barlow, Barlow_Condensed } from "next/font/google";

/**
 * Homepage first-impression typefaces (approved mockup, October 2026).
 * Self-hosted at build time like the layout's fonts, so the page makes no
 * runtime requests to Google Fonts.
 */
export const homeDisplayFont = Barlow_Condensed({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-home-display",
  display: "swap",
});

export const homeBodyFont = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-home-body",
  display: "swap",
});
