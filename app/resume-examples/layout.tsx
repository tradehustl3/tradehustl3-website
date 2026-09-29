import type { ReactNode } from "react";
import "../resume-builder/resume-builder.css";
import { rbFont } from "../resume-builder/rb-font";

export default function ResumeExamplesLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={rbFont.variable} style={{ display: "contents" }}>{children}</div>;
}
