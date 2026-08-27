import type { ReactNode } from "react";
import "../page-shell.css";

export default function BookLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
