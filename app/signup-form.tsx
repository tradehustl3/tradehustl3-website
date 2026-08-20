"use client";

import { useEffect, useRef } from "react";

const interests = [
  "The TRADE HUSTL3 Book",
  "Resume Builder",
  "HUSTL3 PRO",
  "Jobsite Gear",
  "School / Workforce Partnership",
  "General TRADE HUSTL3 Updates",
];

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function SignupForm() {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const key of utmKeys) {
      const current = params.get(key);
      if (current) sessionStorage.setItem(key, current);
      const preserved = current ?? sessionStorage.getItem(key);
      const input = formRef.current?.elements.namedItem(key);
      if (preserved && input instanceof HTMLInputElement) input.value = preserved;
    }
  }, []);

  return (
    <form ref={formRef} className="signup" action="mailto:hello@tradehustl3.com" method="post" encType="text/plain">
      <div className="field-group interest-group">
        <label htmlFor="interest">I&apos;M INTERESTED IN</label>
        <select id="interest" name="interest" required defaultValue="">
          <option value="" disabled>SELECT AN INTEREST</option>
          {interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
        </select>
      </div>
      <div className="field-group email-group">
        <label htmlFor="email">EMAIL ADDRESS</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="YOU@EXAMPLE.COM" required />
      </div>
      {utmKeys.map((key) => <input key={key} type="hidden" name={key} defaultValue="" />)}
      <button type="submit">KEEP ME POSTED <span>↗</span></button>
    </form>
  );
}
