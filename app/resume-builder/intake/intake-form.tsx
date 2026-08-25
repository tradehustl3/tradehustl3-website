"use client";

import { FormEvent, useEffect, useState } from "react";

const tradeTracks = [
  "HVAC & Refrigeration",
  "Electrical",
  "Plumbing",
  "Construction & Carpentry",
  "Facilities Maintenance",
  "Welding & Fabrication",
  "General Labor / Trade Helper",
];

type User = { email: string; fullName: string | null };
type IntakeExperience = {
  employer?: string;
  jobTitle?: string;
  location?: string;
  dates?: string;
  responsibilitiesAndWins?: string;
};
type IntakeDraft = {
  contact?: { fullName?: string; phone?: string; cityState?: string };
  career?: {
    yearsExperience?: string;
    summaryNotes?: string;
    skillsAndTools?: string;
    licensesAndCertifications?: string;
    safetyTraining?: string;
  };
  experience?: IntakeExperience[];
  education?: string;
  additionalDetails?: string;
};
type ResumeStatus = {
  resumeId: string;
  paid: boolean;
  trade: string;
  title: string;
  targetJobPosting: string | null;
  intake: IntakeDraft;
};

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function IntakeForm() {
  const [user, setUser] = useState<User | null>(null);
  const [editingResumeId, setEditingResumeId] = useState("");
  const [editingPaid, setEditingPaid] = useState(false);
  const [draft, setDraft] = useState<ResumeStatus | null>(null);
  const [savedResumeId, setSavedResumeId] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const resumedId = params.get("resume_id") ?? "";
        const accountResponse = await fetch("/api/resume-builder/me", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (accountResponse.status === 401) {
          window.location.assign("/resume-builder");
          return;
        }
        const account = await accountResponse.json() as { user?: User; message?: string };
        if (!accountResponse.ok || !account.user) {
          throw new Error(account.message || "We could not verify your account.");
        }
        if (!active) return;
        setUser(account.user);

        if (resumedId) {
          const resumeResponse = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumedId)}`, {
            credentials: "same-origin",
            cache: "no-store",
          });
          const result = await resumeResponse.json() as { resume?: ResumeStatus; message?: string };
          if (!resumeResponse.ok || !result.resume) {
            throw new Error(result.message || "We could not load your saved intake.");
          }
          if (!active) return;
          setEditingResumeId(resumedId);
          setEditingPaid(result.resume.paid);
          setDraft(result.resume);
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "We could not load your intake.");
      } finally {
        if (active) setInitializing(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  async function startCheckout(resumeId: string) {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/resume-builder/resumes/${encodeURIComponent(resumeId)}/checkout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await response.json() as { checkoutUrl?: string; message?: string };
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.message || "Secure checkout is temporarily unavailable.");
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secure checkout is temporarily unavailable.");
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const experience = [1, 2].map((index) => ({
      employer: value(form, `employer${index}`),
      jobTitle: value(form, `jobTitle${index}`),
      location: value(form, `jobLocation${index}`),
      dates: value(form, `jobDates${index}`),
      responsibilitiesAndWins: value(form, `jobDetails${index}`),
    })).filter((job) => Object.values(job).some(Boolean));
    const intake = {
      contact: {
        fullName: value(form, "fullName"),
        email: user?.email ?? "",
        phone: value(form, "phone"),
        cityState: value(form, "cityState"),
      },
      career: {
        yearsExperience: value(form, "yearsExperience"),
        summaryNotes: value(form, "summaryNotes"),
        skillsAndTools: value(form, "skillsAndTools"),
        licensesAndCertifications: value(form, "licensesAndCertifications"),
        safetyTraining: value(form, "safetyTraining"),
      },
      experience,
      education: value(form, "education"),
      additionalDetails: value(form, "additionalDetails"),
    };

    try {
      const endpoint = editingResumeId
        ? `/api/resume-builder/resumes/${encodeURIComponent(editingResumeId)}`
        : "/api/resume-builder/resumes";
      const response = await fetch(endpoint, {
        method: editingResumeId ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: value(form, "trade"),
          title: value(form, "targetTitle"),
          targetJobPosting: value(form, "targetJobPosting"),
          intake,
        }),
      });
      const result = await response.json() as { resumeId?: string; message?: string };
      const resumeId = result.resumeId || editingResumeId;
      if (!response.ok || !resumeId) throw new Error(result.message || "We could not save your intake.");
      if (editingPaid) {
        window.location.assign(`/resume-builder/review?resume_id=${encodeURIComponent(resumeId)}`);
        return;
      }
      setSavedResumeId(resumeId);
      await startCheckout(resumeId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not save your intake.");
      setSubmitting(false);
    }
  }

  if (savedResumeId) {
    return (
      <div className="rb-retry-card">
        <span className="rb-message-icon">✓</span>
        <p className="rb-kicker">/ INTAKE SAVED</p>
        <h2>YOUR DETAILS ARE SECURE.</h2>
        <p>No resume has been generated yet. Complete the one-time $9.99 payment to unlock the initial build and three corrections.</p>
        {message ? <p className="rb-inline-error" role="alert">{message}</p> : null}
        <button className="rb-button rb-button-primary" type="button" disabled={submitting} onClick={() => startCheckout(savedResumeId)}>
          {submitting ? "Opening secure checkout…" : "Continue to $9.99 checkout"} <span>↗</span>
        </button>
      </div>
    );
  }

  const intake = draft?.intake ?? {};
  const career = intake.career ?? {};
  const jobs = [intake.experience?.[0] ?? {}, intake.experience?.[1] ?? {}];
  const primaryAction = editingPaid ? "Save intake & return to review" : "Save & continue to payment";

  return (
    <form
      key={`${draft?.resumeId ?? "new"}:${user?.email ?? "loading"}`}
      className="rb-intake-form"
      onSubmit={submit}
      aria-busy={initializing}
    >
      <div className="rb-form-banner">
        <div>
          <span className="rb-status-dot" aria-hidden="true" />
          <p>Verified account</p>
          <strong>{user?.email || "Secure session"}</strong>
        </div>
        <small>{editingPaid ? "Your payment and available AI runs are unchanged." : "Nothing is generated until after payment."}</small>
      </div>

      {editingResumeId ? (
        <div className="rb-intake-notice" role="status">
          <strong>Update the details that need attention.</strong>
          <p>Your payment is safe, no failed AI run was used, and your last successful resume remains available.</p>
        </div>
      ) : null}

      <section className="rb-form-section" aria-labelledby="target-heading">
        <div className="rb-form-section-heading"><span>01</span><div><p>Target</p><h2 id="target-heading">WHAT WORK ARE YOU AFTER?</h2></div></div>
        <div className="rb-field-grid">
          <div className="rb-field">
            <label htmlFor="trade">Trade track</label>
            <select id="trade" name="trade" required defaultValue={draft?.trade ?? ""}>
              <option value="" disabled>Choose your trade</option>
              {tradeTracks.map((trade) => <option key={trade}>{trade}</option>)}
            </select>
          </div>
          <div className="rb-field">
            <label htmlFor="targetTitle">Target job title</label>
            <input id="targetTitle" name="targetTitle" required maxLength={120} placeholder="e.g. HVAC Service Technician" defaultValue={draft?.title ?? ""} />
          </div>
          <div className="rb-field rb-field-wide">
            <label htmlFor="targetJobPosting">Target job posting <span>Optional, but recommended</span></label>
            <textarea id="targetJobPosting" name="targetJobPosting" maxLength={12000} rows={6} placeholder="Paste the job description here so the resume can mirror relevant language without inventing experience." defaultValue={draft?.targetJobPosting ?? ""} />
          </div>
        </div>
      </section>

      <section className="rb-form-section" aria-labelledby="contact-heading">
        <div className="rb-form-section-heading"><span>02</span><div><p>Contact</p><h2 id="contact-heading">HOW SHOULD EMPLOYERS REACH YOU?</h2></div></div>
        <div className="rb-field-grid rb-field-grid-3">
          <div className="rb-field"><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" required maxLength={120} autoComplete="name" defaultValue={intake.contact?.fullName ?? user?.fullName ?? ""} /></div>
          <div className="rb-field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required maxLength={40} autoComplete="tel" placeholder="(555) 555-0123" defaultValue={intake.contact?.phone ?? ""} /></div>
          <div className="rb-field"><label htmlFor="cityState">City + state</label><input id="cityState" name="cityState" required maxLength={120} autoComplete="address-level2" placeholder="Atlanta, GA" defaultValue={intake.contact?.cityState ?? ""} /></div>
        </div>
      </section>

      <section className="rb-form-section" aria-labelledby="skills-heading">
        <div className="rb-form-section-heading"><span>03</span><div><p>Field value</p><h2 id="skills-heading">WHAT CAN YOU DO?</h2></div></div>
        <div className="rb-field-grid">
          <div className="rb-field"><label htmlFor="yearsExperience">Years of experience</label><select id="yearsExperience" name="yearsExperience" required defaultValue={career.yearsExperience ?? ""}><option value="" disabled>Select a range</option><option>No paid experience yet</option><option>Less than 1 year</option><option>1–2 years</option><option>3–5 years</option><option>6–10 years</option><option>11+ years</option></select></div>
          <div className="rb-field"><label htmlFor="skillsAndTools">Skills, systems + tools</label><textarea id="skillsAndTools" name="skillsAndTools" required rows={4} maxLength={3000} placeholder="Diagnostics, brazing, multimeter, CMMS, rooftop units…" defaultValue={career.skillsAndTools ?? ""} /></div>
          <div className="rb-field"><label htmlFor="licensesAndCertifications">Licenses + certifications</label><textarea id="licensesAndCertifications" name="licensesAndCertifications" rows={4} maxLength={2000} placeholder="EPA 608 Universal, OSHA 10, state license…" defaultValue={career.licensesAndCertifications ?? ""} /></div>
          <div className="rb-field"><label htmlFor="safetyTraining">Safety + specialized training</label><textarea id="safetyTraining" name="safetyTraining" rows={4} maxLength={2000} placeholder="LOTO, confined space, lift operation…" defaultValue={career.safetyTraining ?? ""} /></div>
          <div className="rb-field rb-field-wide"><label htmlFor="summaryNotes">What should an employer know about you?</label><textarea id="summaryNotes" name="summaryNotes" required rows={5} maxLength={3000} placeholder="Describe the kind of work you handle, how you work, and what makes you dependable. Plain language is fine." defaultValue={career.summaryNotes ?? ""} /></div>
        </div>
      </section>

      <section className="rb-form-section" aria-labelledby="experience-heading">
        <div className="rb-form-section-heading"><span>04</span><div><p>Work history · optional</p><h2 id="experience-heading">SHOW THE WORK.</h2></div></div>
        <p className="rb-job-note">No employment history yet? Leave this section blank. Trade school, certifications, skills, apprenticeships, and supported side work can still build a strong resume.</p>
        <div className="rb-job-list">
          {[1, 2].map((index) => {
            const job = jobs[index - 1];
            return (
              <fieldset className="rb-job" key={index}>
                <legend>{index === 1 ? "Most recent role (optional)" : "Previous role (optional)"}</legend>
                <div className="rb-field-grid rb-field-grid-2">
                  <div className="rb-field"><label htmlFor={`employer${index}`}>Employer <span>Optional for self-employment</span></label><input id={`employer${index}`} name={`employer${index}`} maxLength={160} defaultValue={job.employer ?? ""} /></div>
                  <div className="rb-field"><label htmlFor={`jobTitle${index}`}>Job title</label><input id={`jobTitle${index}`} name={`jobTitle${index}`} maxLength={120} defaultValue={job.jobTitle ?? ""} /></div>
                  <div className="rb-field"><label htmlFor={`jobLocation${index}`}>Location</label><input id={`jobLocation${index}`} name={`jobLocation${index}`} maxLength={120} placeholder="City, state" defaultValue={job.location ?? ""} /></div>
                  <div className="rb-field"><label htmlFor={`jobDates${index}`}>Dates</label><input id={`jobDates${index}`} name={`jobDates${index}`} maxLength={80} placeholder="May 2022 – Present" defaultValue={job.dates ?? ""} /></div>
                  <div className="rb-field rb-field-wide"><label htmlFor={`jobDetails${index}`}>Responsibilities, equipment + wins</label><textarea id={`jobDetails${index}`} name={`jobDetails${index}`} rows={6} maxLength={4000} placeholder="What did you install, maintain, repair, lead, improve, or complete? Add numbers where you know them." defaultValue={job.responsibilitiesAndWins ?? ""} /></div>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className="rb-form-section" aria-labelledby="finish-heading">
        <div className="rb-form-section-heading"><span>05</span><div><p>Finish</p><h2 id="finish-heading">ADD THE LAST DETAILS.</h2></div></div>
        <div className="rb-field-grid">
          <div className="rb-field"><label htmlFor="education">Education + apprenticeships</label><textarea id="education" name="education" rows={4} maxLength={2500} placeholder="School, union or non-union apprenticeship, graduation year…" defaultValue={intake.education ?? ""} /></div>
          <div className="rb-field"><label htmlFor="additionalDetails">Other relevant details</label><textarea id="additionalDetails" name="additionalDetails" rows={4} maxLength={2500} placeholder="Awards, languages, volunteer work, military experience…" defaultValue={intake.additionalDetails ?? ""} /></div>
        </div>
      </section>

      <div className="rb-checkout-bar">
        <div><span>{editingPaid ? "Already paid" : "Total today"}</span><strong>{editingPaid ? "$0" : "$9.99"}</strong><small>{editingPaid ? "No extra charge · available runs unchanged" : "One completed resume · no subscription"}</small></div>
        <button className="rb-button rb-button-primary" type="submit" disabled={submitting}>{submitting ? "Saving your intake…" : primaryAction} <span>→</span></button>
      </div>
      {message ? <p className="rb-inline-error rb-form-error" role="alert">{message}</p> : null}
    </form>
  );
}
