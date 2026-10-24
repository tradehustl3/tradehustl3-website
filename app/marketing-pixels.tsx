"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { startDeferredMetaPixel } from "./deferred-meta-pixel";

export const TRACKING_PREFERENCE_KEY = "tradehustl3_optional_tracking";
export const TRACKING_PREFERENCE_EVENT = "tradehustl3-tracking-preference-change";

const MARKETING_PATHS = new Set([
  "/",
  "/book",
  "/book/sample",
  "/book/sample/read",
  "/top-10-trades",
  "/resume-builder",
  "/resume-builder/hvac",
  "/resume-builder/electrician",
  "/resume-builder/electrical",
  "/resume-builder/plumbing",
  "/resume-builder/construction-carpentry",
  "/resume-builder/facilities-maintenance",
  "/resume-builder/welding-fabrication",
  "/resume-builder/general-labor",
]);

export function optionalTrackingAllowed(): boolean {
  try {
    const navigatorWithGpc = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (navigatorWithGpc.globalPrivacyControl === true) return false;
    return window.localStorage.getItem(TRACKING_PREFERENCE_KEY) !== "disabled";
  } catch {
    return false;
  }
}

export function subscribeToTrackingPreference(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(TRACKING_PREFERENCE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TRACKING_PREFERENCE_EVENT, onChange);
  };
}

function DeferredMetaPixel() {
  useEffect(() => startDeferredMetaPixel(
    () => MARKETING_PATHS.has(window.location.pathname) && optionalTrackingAllowed(),
  ), []);
  return null;
}

export function MarketingPixels() {
  const pathname = usePathname();
  const allowed = useSyncExternalStore(
    subscribeToTrackingPreference,
    () => MARKETING_PATHS.has(pathname) && optionalTrackingAllowed(),
    () => false,
  );

  if (!allowed) return null;

  return (
    <>
      <Script id="pinterest-base" strategy="afterInteractive">{`
        !function(e){if(!window.pintrk){window.pintrk=function(){
        window.pintrk.queue.push(Array.prototype.slice.call(arguments))};
        var n=window.pintrk;n.queue=[],n.version="3.0";
        var t=document.createElement("script");t.async=!0;t.src=e;
        var r=document.getElementsByTagName("script")[0];
        r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
        pintrk('load', '2614218071063');
        pintrk('page');
      `}</Script>
      <DeferredMetaPixel />
    </>
  );
}
