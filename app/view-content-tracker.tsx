"use client";

import { useEffect, useRef } from "react";
import { trackViewContent, type AnalyticsParameters, type MetaLeadContentName, type ProductContentName } from "./analytics";

export function ViewContentTracker({
  contentName,
  parameters,
  observe = false,
  eventKey,
}: {
  contentName: MetaLeadContentName | ProductContentName;
  parameters?: AnalyticsParameters;
  observe?: boolean;
  eventKey?: string;
}) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!observe) {
      trackViewContent(contentName, parameters, eventKey);
      return;
    }
    const element = marker.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      trackViewContent(contentName, parameters, eventKey);
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [contentName, eventKey, observe, parameters]);

  return <span ref={marker} style={observe ? { display: "block", width: 1, height: 1 } : undefined} hidden={!observe} aria-hidden="true" />;
}
