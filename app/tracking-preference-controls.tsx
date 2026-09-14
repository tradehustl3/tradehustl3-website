"use client";

import { useSyncExternalStore } from "react";
import {
  TRACKING_PREFERENCE_EVENT,
  TRACKING_PREFERENCE_KEY,
  subscribeToTrackingPreference,
} from "./marketing-pixels";

function trackingDisabled(): boolean {
  try {
    return window.localStorage.getItem(TRACKING_PREFERENCE_KEY) === "disabled";
  } catch {
    return true;
  }
}

export function TrackingPreferenceControls() {
  const disabled = useSyncExternalStore(
    subscribeToTrackingPreference,
    trackingDisabled,
    () => false,
  );

  function update(nextDisabled: boolean) {
    try {
      window.localStorage.setItem(TRACKING_PREFERENCE_KEY, nextDisabled ? "disabled" : "enabled");
      window.dispatchEvent(new Event(TRACKING_PREFERENCE_EVENT));
    } catch {
      // If storage is unavailable, optional trackers remain blocked by their own safety check.
    }
  }

  return (
    <div>
      <p><strong>Optional analytics and advertising tracking is {disabled ? "off" : "on"} for this browser.</strong></p>
      <p>This control applies to Google Analytics, Meta, and Pinterest. Essential security, account, payment, and document-delivery functions remain active.</p>
      <button className="button" type="button" onClick={() => update(!disabled)}>
        {disabled ? "Allow optional tracking" : "Turn off optional tracking"}
      </button>
    </div>
  );
}
