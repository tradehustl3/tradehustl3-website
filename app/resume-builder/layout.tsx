import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./resume-builder.css";

export const metadata: Metadata = {
  title: {
    default: "Skilled Trades Resume Builder | TRADE HUSTL3",
    template: "%s | TRADE HUSTL3 Resume Builder",
  },
  description:
    "Build one job-ready skilled-trades resume with a paid initial draft, watermarked review, three AI corrections, and clean PDF and DOCX downloads.",
};

export default function ResumeBuilderLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
