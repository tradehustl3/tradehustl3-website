"use client";

import { useEffect, useState } from "react";

const RELEASE_TIME = new Date("2026-09-15T00:00:00-04:00").getTime();

export function OrderConfirmationCopy() {
  const [isReleased, setIsReleased] = useState(false);

  useEffect(() => {
    setIsReleased(Date.now() >= RELEASE_TIME);
  }, []);

  if (isReleased) {
    return (
      <>
        <p className="section-label">/ PAYMENT CONFIRMED</p>
        <h1>YOU’RE IN.<br /><span>LET’S BUILD.</span></h1>
        <p>
          Your TRADE HUSTL3 eBook purchase is complete. Your private download link is being sent to the email address used at checkout.
        </p>
        <div className="order-confirmed-note">
          <strong>Check your inbox and spam folder.</strong>
          <span>The delivery email will come from TRADE HUSTL3. Keep it for future downloads.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="section-label">/ PREORDER CONFIRMED</p>
      <h1>YOU’RE IN.<br /><span>LAUNCH LOCKED.</span></h1>
      <p>
        Your $9.99 TRADE HUSTL3 eBook preorder is confirmed. You were charged today, and your private download will be emailed on September 15, 2026.
      </p>
      <div className="order-confirmed-note">
        <strong>Keep your confirmation email.</strong>
        <span>A second email containing your private download link will arrive from TRADE HUSTL3 on release day.</span>
      </div>
    </>
  );
}
