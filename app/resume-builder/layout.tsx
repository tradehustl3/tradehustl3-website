import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./resume-builder.css";
import "./ats-score.css";

export const metadata: Metadata = {
  title: {
    default: "Skilled Trades Resume Builder | TRADE HUSTL3",
    template: "%s | TRADE HUSTL3 Resume Builder",
  },
  description:
    "Build and review a protected skilled-trades resume preview before paying $9.99, then unlock three AI corrections and clean PDF and DOCX downloads.",
};

export default function ResumeBuilderLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
