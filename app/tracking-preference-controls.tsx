"use client";

import { useEffect, useState } from "react";
import { TRACKING_PREFERENCE_KEY } from "./marketing-pixels";

export function TrackingPreferenceControls() {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    try {
      setDisabled(window.localStorage.getItem(TRACKING_PREFERENCE_KEY) === "disabled");
    } catch {
      setDisabled(true);
    }
  }, []);

  function update(nextDisabled: boolean) {
    try {
      window.localStorage.setItem(TRACKING_PREFERENCE_KEY, nextDisabled ? "disabled" : "enabled");
      setDisabled(nextDisabled);
    } catch {
      setDisabled(true);
    }
  }

  return (
    <div>
      <p><strong>Optional analytics and advertising tracking is {disabled ? "off" : "on"} for this browser.</strong></p>
      <p>This control applies to Google Analytics, Meta, and Pinterest. Essential security, account, payment, and document-delivery functions remain active.</p>
      <button type="button" onClick={() => update(!disabled)}>
        {disabled ? "Allow optional tracking" : "Turn off optional tracking"}
      </button>
    </div>
  );
}
