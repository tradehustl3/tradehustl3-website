/** Every way back to the intake keeps the draft's resume_id so saved work reloads. */
export function intakeReturnUrl(resumeId: string): string {
  return resumeId ? `/resume-builder/intake?resume_id=${encodeURIComponent(resumeId)}` : "/resume-builder/intake";
}

/**
 * Where a failed generation should send the customer, or null when the failure is
 * not an intake problem. "review_exceptions" and "return_to_intake" both return to
 * the intake; a server-supplied URL is used only when it is a same-site intake path.
 */
export function generationFailureIntakeUrl(result: { action?: string; intakeUrl?: string | null }, resumeId: string): string | null {
  if (result.action !== "return_to_intake" && result.action !== "review_exceptions") return null;
  const url = result.intakeUrl ?? "";
  return /^\/resume-builder\/intake(?:\?|$)/.test(url) && url.includes("resume_id=") ? url : intakeReturnUrl(resumeId);
}
