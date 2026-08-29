import type { MetaLeadTracker } from "./meta-pixel";

export type SignupPayload = {
  email: FormDataEntryValue | string | null;
  interest: FormDataEntryValue | string | null;
  signup_source?: FormDataEntryValue | string | null;
  utm_source?: FormDataEntryValue | string | null;
  utm_medium?: FormDataEntryValue | string | null;
  utm_campaign?: FormDataEntryValue | string | null;
  utm_content?: FormDataEntryValue | string | null;
  utm_term?: FormDataEntryValue | string | null;
};

export type SignupResult = {
  ok?: boolean;
  message?: string;
  sampleUrl?: string;
  funnel?: string;
};

type SubmitSignupOptions = {
  trackMetaLead?: MetaLeadTracker;
  fetchImpl?: typeof fetch;
  fallbackErrorMessage?: string;
};

/** Posts a signup and emits its Meta Lead only after a confirmed 2xx response. */
export async function submitSignup(
  payload: SignupPayload,
  {
    trackMetaLead,
    fetchImpl = fetch,
    fallbackErrorMessage = "Signup failed.",
  }: SubmitSignupOptions = {},
): Promise<SignupResult> {
  const response = await fetchImpl("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as SignupResult;

  if (!response.ok || result.ok !== true) {
    throw new Error(result.message || fallbackErrorMessage);
  }

  trackMetaLead?.();
  return result;
}
