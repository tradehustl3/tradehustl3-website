import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./resume-builder.css";
import { rbFont } from "./rb-font";

export const metadata: Metadata = {
  title: {
    // Wrapped by the root template, so this renders "Skilled Trades Resume Builder | TRADE HUSTL3".
    default: "Skilled Trades Resume Builder",
    template: "%s | TRADE HUSTL3 Resume Builder",
  },
  description:
    "Build and review a protected skilled-trades resume preview before paying $9.99, then unlock three AI corrections and clean PDF and DOCX downloads.",
};

export default function ResumeBuilderLayout({ children }: Readonly<{ children: ReactNode }>) {
  // `display: contents` keeps page layout unchanged while scoping the Inter variable.
  return <div className={rbFont.variable} style={{ display: "contents" }}>{children}</div>;
}
