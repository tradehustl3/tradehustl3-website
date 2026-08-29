"use client";

import { useEffect } from "react";
import { captureAttribution } from "./analytics";

export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
