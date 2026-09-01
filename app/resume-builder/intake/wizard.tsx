"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Hustl3Bot } from "../hustl3-bot";
import {
  COMMON_CERTIFICATIONS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  SAFETY_TRAINING_EXAMPLES,
  SOFTWARE_EXAMPLES,
  TRADE_GUIDANCE,
  TRADE_TRACKS,
  WIZARD_STEPS,
  isTradeTrack,
} from "../trade-content";
import {
  clearIntakeTrade,
  recallIntakeTrade,
  resolveTradeParam,
  slugForTradeTrack,
} from "../trade-preselect";
import { ChipField } from "./chip-field";
import {
  emptyRole,
  emptyWizardData,
  fieldValueHasContent,
  fromIntake,
  roleDates,
  roleHasContent,
  toIntake,
  type WizardData,
} from "./wizard-data";

type User = { email: string; fullName: string | null };
type ResumeStatus = {
  resumeId: string;
  paid: boolean;
  trade: string;
  title: string;
  targetJobPosting: string | null;
  intake: unknown;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const LAST_STEP = WIZARD_STEPS.length - 1;

function classSet(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function ResumeWizard() {
  const [user, setUser] = useState<User | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [paid, setPaid] = useState(false);
  const [data, setData] = useState<WizardData>(emptyWizardData);
  const [step, setStep] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const saveInFlight = useRef(false);
  const pendingSave = useRef(false);
  const lastSaved = useRef("");
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // ---- load account + optional saved draft -------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const existingId = params.get("resume_id") ?? "";
        const requestedTrade = resolveTradeParam(params.get("trade"));
        const meResponse = await fetch("/api/resume-builder/me", { credentials: "same-origin", cache: "no-store" });
        if (meResponse.status === 401) {
          // Send unverified visitors to the account step, keeping the trade they picked.
          const handoff = requestedTrade ? `?trade=${slugForTradeTrack(requestedTrade)}` : "";
          window.location.assign(`/resume-builder${handoff}`);
          return;
        }
        const account = (await meResponse.json()) as { user?: User; message?: string };
        if (!meResponse.ok || !account.user) throw new Error(account.message || "We could not verify your account.");
        if (!active) return;
        setUser(account.user);

        let nextData = emptyWizardData();
        nextData.contact.fullName = account.user.fullName ?? "";
        // Preselect the trade from a trade landing page (?trade=) or the magic-link bridge.
        const preselectTrade = requestedTrade ?? recallIntakeTrade();
        if (preselectTrade) {
          nextData.trade = preselectTrade;
          clearIntakeTrade();
        }

        if (existingId) {
          const resumeResponse = await fetch(
            `/api/resume-builder/resumes/${encodeURIComponent(existingId)}`,
            { credentials: "same-origin", cache: "no-store" },
          );
          const result = (await resumeResponse.json()) as { resume?: ResumeStatus; message?: string };
          if (!resumeResponse.ok || !result.resume) {
            throw new Error(result.message || "We could not load your saved draft.");
          }
          if (!active) return;
          setResumeId(existingId);
          setPaid(result.resume.paid);
          nextData = fromIntake(result.resume.intake, {
            trade: result.resume.trade,
            title: result.resume.title,
            posting: result.resume.targetJobPosting ?? "",
            fullName: account.user.fullName,
          });
        }

        if (!active) return;
        setData(nextData);
        setStep(Math.min(nextData.lastStep, LAST_STEP));
        lastSaved.current = JSON.stringify(buildBody(nextData, account.user.email));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "We could not load your workspace.");
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch: Partial<WizardData> | ((prev: WizardData) => WizardData)) => {
    setData((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  // ---- autosave (debounced, single-flight) --------------------------------
  const saveRef = useRef<(next: WizardData) => Promise<string | null>>(async () => null);
  useEffect(() => {
    saveRef.current = async (nextData: WizardData): Promise<string | null> => {
      if (!user || !isTradeTrack(nextData.trade)) return null;
      const body = buildBody(nextData, user.email);
      const serialized = JSON.stringify(body);
      if (serialized === lastSaved.current) return resumeId || null;
      if (saveInFlight.current) {
        pendingSave.current = true;
        return resumeId || null;
      }
      saveInFlight.current = true;
      setSaveState("saving");
      try {
        const endpoint = resumeId
          ? `/api/resume-builder/resumes/${encodeURIComponent(resumeId)}`
          : "/api/resume-builder/resumes";
        const response = await fetch(endpoint, {
          method: resumeId ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        const result = (await response.json()) as { resumeId?: string; message?: string };
        if (!response.ok) throw new Error(result.message || "We could not save your progress.");
        const savedId = result.resumeId || resumeId;
        if (savedId && savedId !== resumeId) {
          setResumeId(savedId);
          const url = new URL(window.location.href);
          url.searchParams.set("resume_id", savedId);
          window.history.replaceState(null, "", url.toString());
        }
        lastSaved.current = serialized;
        setSaveState("saved");
        return savedId || null;
      } catch (saveError) {
        setSaveState("error");
        setError(saveError instanceof Error ? saveError.message : "We could not save your progress.");
        return null;
      } finally {
        saveInFlight.current = false;
        if (pendingSave.current) {
          pendingSave.current = false;
          void saveRef.current(dataRef.current);
        }
      }
    };
  });

  const persist = useCallback((next: WizardData) => saveRef.current(next), []);

  useEffect(() => {
    if (initializing || !user) return;
    const timer = setTimeout(() => void saveRef.current({ ...dataRef.current, lastStep: step }), 1500);
    return () => clearTimeout(timer);
  }, [data, step, initializing, user]);

  // ---- step navigation ----------------------------------------------------
  useEffect(() => {
    if (initializing) return;
    headingRef.current?.focus();
  }, [step, initializing]);

  const stepErrors = useMemo(() => validateStep(step, data, paid, legalConsent), [step, data, paid, legalConsent]);

  function resetStepUi() {
    setAttemptedNext(false);
    setError("");
  }

  async function goNext() {
    if (stepErrors.length) {
      setAttemptedNext(true);
      return;
    }
    await persist({ ...data, lastStep: Math.min(step + 1, LAST_STEP) });
    resetStepUi();
    setStep((value) => Math.min(value + 1, LAST_STEP));
  }

  function goBack() {
    resetStepUi();
    setStep((value) => Math.max(value - 1, 0));
  }

  function editStep(target: number) {
    resetStepUi();
    setStep(target);
  }

  async function submitBuild() {
    if (stepErrors.length) {
      setAttemptedNext(true);
      return;
    }
    setSubmitting(true);
    setError("");
    const savedId = await persist({ ...data, lastStep: LAST_STEP });
    const id = savedId || resumeId;
    if (!id) {
      setSubmitting(false);
      setError("We could not save your intake. Check your connection and try again.");
      return;
    }
    const target = paid
      ? `/resume-builder/review?resume_id=${encodeURIComponent(id)}`
      : `/resume-builder/review?resume_id=${encodeURIComponent(id)}&build=1`;
    window.location.assign(target);
  }

  if (initializing) {
    return (
      <div className="rb-wiz-loading" role="status">
        <span aria-hidden="true" />
        <p>Loading your secure workspace…</p>
      </div>
    );
  }

  const activeStep = WIZARD_STEPS[step];
  const percent = Math.round((step / LAST_STEP) * 100);
  const showConsent = !paid && step === LAST_STEP;

  return (
    <div className="rb-wiz">
      <WizardProgress step={step} percent={percent} onJump={editStep} />

      <div className="rb-wiz-shell">
        <div className="rb-wiz-main">
          <p className="rb-kicker">/ BUILD · STEP {step + 1} OF {WIZARD_STEPS.length}</p>

          <div className="rb-wiz-step" key={activeStep.key}>
            {step === 0 ? renderTrade() : null}
            {step === 1 ? renderExperience() : null}
            {step === 2 ? renderWorkHistory() : null}
            {step === 3 ? renderFieldValue() : null}
            {step === 4 ? renderTargetJob() : null}
            {step === 5 ? renderReview() : null}
            {step === 6 ? renderGenerate() : null}
          </div>

          {attemptedNext && stepErrors.length ? (
            <div className="rb-wiz-errors" role="alert">
              <strong>Add a little more before continuing:</strong>
              <ul>{stepErrors.map((message) => <li key={message}>{message}</li>)}</ul>
            </div>
          ) : null}

          {error ? <p className="rb-inline-error" role="alert">{error}</p> : null}

          {showConsent ? (
            <label className="rb-legal-consent">
              <input
                type="checkbox"
                checked={legalConsent}
                onChange={(event) => setLegalConsent(event.target.checked)}
              />
              <span>
                I am at least 18 years old and agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>,{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>,{" "}
                <a href="/resume-builder/refund-policy" target="_blank" rel="noreferrer">Refund Policy</a>, and{" "}
                <a href="/resume-builder/ai-disclosure" target="_blank" rel="noreferrer">AI Disclosure</a>.
              </span>
            </label>
          ) : null}

          <div className="rb-wiz-nav">
            <button
              type="button"
              className="rb-button rb-button-ghost"
              onClick={goBack}
              disabled={step === 0 || submitting}
            >
              <span aria-hidden="true">←</span> BACK
            </button>
            <span className="rb-save-state" data-state={saveState} aria-live="polite">
              {saveState === "saving" ? "Saving…" : null}
              {saveState === "saved" ? "Progress saved" : null}
              {saveState === "error" ? "Save failed — retrying" : null}
            </span>
            {step < 5 ? (
              <button type="button" className="rb-button rb-button-primary" onClick={() => void goNext()}>
                CONTINUE <span aria-hidden="true">→</span>
              </button>
            ) : null}
            {step === 5 ? (
              <button type="button" className="rb-button rb-button-primary" onClick={() => void goNext()}>
                REVIEW MY INFO <span aria-hidden="true">→</span>
              </button>
            ) : null}
            {step === 6 ? (
              <button
                type="button"
                className="rb-button rb-button-primary rb-button-build"
                onClick={() => void submitBuild()}
                disabled={submitting}
              >
                {submitting
                  ? "SAVING YOUR INTAKE…"
                  : paid
                    ? "SAVE & RETURN TO REVIEW"
                    : "BUILD MY WATERMARKED RESUME"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="rb-wiz-side">
          <Hustl3Bot step={activeStep.key} trade={data.trade} />
          <ValueRail paid={paid} />
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------- steps ---
  function renderTrade() {
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>WHAT TRADE ARE WE BUILDING FOR?</h1>
        <p className="rb-wiz-lead">Choose the lane employers should notice first. Crossover experience still goes on the resume.</p>
        <div className="rb-trade-grid" role="radiogroup" aria-label="Trade track">
          {TRADE_TRACKS.map((trade) => {
            const selected = data.trade === trade;
            return (
              <button
                type="button"
                key={trade}
                role="radio"
                aria-checked={selected}
                className={classSet("rb-trade-card", selected && "rb-trade-card-on")}
                onClick={() => update({ trade })}
              >
                <span className="rb-trade-card-name">{trade}</span>
                <span className="rb-trade-card-note">{TRADE_GUIDANCE[trade].tagline}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderExperience() {
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>HOW MUCH FIELD EXPERIENCE ARE WE WORKING WITH?</h1>
        <p className="rb-wiz-lead">
          No paid experience yet is fine. Trade school, apprenticeships, certifications, side work, military service,
          volunteer work, tools, and technical training all build a strong resume.
        </p>
        <div className="rb-level-grid" role="radiogroup" aria-label="Field experience">
          {EXPERIENCE_LEVELS.map((level) => {
            const selected = data.experienceLevel === level;
            return (
              <button
                type="button"
                key={level}
                role="radio"
                aria-checked={selected}
                className={classSet("rb-level-card", selected && "rb-level-card-on")}
                onClick={() => update({ experienceLevel: level })}
              >
                {level}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderWorkHistory() {
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>WHAT HAVE YOU ACTUALLY DONE?</h1>
        <p className="rb-wiz-lead">
          Add every role that shows trade skill — employer jobs, self-employment, contract, apprentice, helper,
          school lab, military, volunteer, or side work. No employment yet? Leave the roles blank and lean on your
          training and skills.
        </p>

        <fieldset className="rb-wiz-contact">
          <legend>Your details</legend>
          <div className="rb-field-grid rb-field-grid-3">
            <Text label="Full name" value={data.contact.fullName} onChange={(v) => update((p) => ({ ...p, contact: { ...p.contact, fullName: v } }))} required invalid={attemptedNext && !data.contact.fullName.trim()} autoComplete="name" />
            <Text label="Phone" value={data.contact.phone} onChange={(v) => update((p) => ({ ...p, contact: { ...p.contact, phone: v } }))} required invalid={attemptedNext && !data.contact.phone.trim()} autoComplete="tel" placeholder="(555) 555-0123" />
            <Text label="City + state" value={data.contact.cityState} onChange={(v) => update((p) => ({ ...p, contact: { ...p.contact, cityState: v } }))} required invalid={attemptedNext && !data.contact.cityState.trim()} autoComplete="address-level2" placeholder="Atlanta, GA" />
          </div>
          <TextArea
            label="What should an employer know about you?"
            hint="Plain language. The kind of work you handle, how you work, what makes you dependable."
            rows={4}
            maxLength={3000}
            value={data.summaryNotes}
            onChange={(v) => update({ summaryNotes: v })}
            required
            invalid={attemptedNext && !data.summaryNotes.trim()}
          />
        </fieldset>

        <div className="rb-roles">
          {data.roles.map((role, index) => (
            <fieldset className="rb-role" key={index}>
              <div className="rb-role-head">
                <legend>Role {index + 1}</legend>
                {data.roles.length > 1 ? (
                  <button
                    type="button"
                    className="rb-text-button"
                    onClick={() => update((p) => ({ ...p, roles: p.roles.filter((_, i) => i !== index) }))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="rb-field-grid rb-field-grid-2">
                <Text label="Employer" hint="Optional for self-employment" value={role.employer} onChange={(v) => patchRole(index, { employer: v })} />
                <Text label="Job title" value={role.jobTitle} onChange={(v) => patchRole(index, { jobTitle: v })} />
                <Text label="City / state" value={role.location} onChange={(v) => patchRole(index, { location: v })} placeholder="City, state" />
                <Select label="Employment type" value={role.employmentType} onChange={(v) => patchRole(index, { employmentType: v })} options={EMPLOYMENT_TYPES} placeholder="Select if useful" />
                <Text label="Start date" value={role.startDate} onChange={(v) => patchRole(index, { startDate: v })} placeholder="May 2022" />
                <div className="rb-field">
                  <label htmlFor={`role-${index}-end`}>End date</label>
                  <div className="rb-role-end">
                    <input
                      id={`role-${index}-end`}
                      className="rb-inline-input"
                      value={role.current ? "" : role.endDate}
                      onChange={(event) => patchRole(index, { endDate: event.target.value })}
                      placeholder="Aug 2024"
                      maxLength={40}
                      disabled={role.current}
                    />
                    <label className="rb-check">
                      <input
                        type="checkbox"
                        checked={role.current}
                        onChange={(event) => patchRole(index, { current: event.target.checked, endDate: "" })}
                      />
                      Present
                    </label>
                  </div>
                </div>
              </div>
              <TextArea label="Responsibilities" rows={3} maxLength={4000} value={role.responsibilities} onChange={(v) => patchRole(index, { responsibilities: v })} hint={data.trade ? TRADE_GUIDANCE[data.trade].workHistory : undefined} />
              <div className="rb-field-grid rb-field-grid-2">
                <TextArea label="Equipment worked on" rows={2} maxLength={2000} value={role.equipment} onChange={(v) => patchRole(index, { equipment: v })} />
                <TextArea label="Systems worked on" rows={2} maxLength={2000} value={role.systems} onChange={(v) => patchRole(index, { systems: v })} />
                <TextArea label="Installs / repairs / maintenance performed" rows={2} maxLength={2000} value={role.workPerformed} onChange={(v) => patchRole(index, { workPerformed: v })} />
                <TextArea label="Leadership responsibilities" rows={2} maxLength={2000} value={role.leadership} onChange={(v) => patchRole(index, { leadership: v })} />
                <TextArea label="Work order / CMMS experience" rows={2} maxLength={2000} value={role.workOrders} onChange={(v) => patchRole(index, { workOrders: v })} />
                <TextArea label="Measurable accomplishments / numbers" rows={2} maxLength={2000} value={role.measurable} onChange={(v) => patchRole(index, { measurable: v })} hint="Units, work orders, techs, properties, PMs, projects, uptime." />
              </div>
            </fieldset>
          ))}
        </div>

        <button
          type="button"
          className="rb-button rb-button-ghost rb-add-role"
          onClick={() => update((p) => ({ ...p, roles: [...p.roles, emptyRole()] }))}
        >
          <span aria-hidden="true">+</span> ADD ANOTHER ROLE
        </button>
      </>
    );
  }

  function renderFieldValue() {
    const guidance = data.trade ? TRADE_GUIDANCE[data.trade] : null;
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>WHAT CAN YOU DO THAT EMPLOYERS CARE ABOUT?</h1>
        <p className="rb-wiz-lead">Select what fits and add your own. Nothing goes on the resume unless you put it here.</p>

        <ChipField
          label="Certifications & licenses"
          hint="EPA 608, OSHA 10/30, state licenses, NCCER, welding certs, forklift, confined space, LOTO, CPR, apprenticeship credentials."
          suggestions={dedupe([...(guidance?.certifications ?? []), ...COMMON_CERTIFICATIONS])}
          values={data.fieldValue.certifications}
          onChange={(next) => patchFieldValue({ certifications: next })}
        />
        <TextArea
          label="License numbers & details"
          hint="Optional. State license numbers, apprenticeship hours, expiration years."
          rows={2}
          maxLength={1500}
          value={data.fieldValue.licenses}
          onChange={(v) => patchFieldValue({ licenses: v })}
        />
        <ChipField
          label="Tools"
          suggestions={guidance?.tools ?? []}
          values={data.fieldValue.tools}
          onChange={(next) => patchFieldValue({ tools: next })}
        />
        <ChipField
          label="Equipment & systems"
          suggestions={guidance?.equipmentSystems ?? []}
          values={data.fieldValue.equipmentSystems}
          onChange={(next) => patchFieldValue({ equipmentSystems: next })}
        />
        <ChipField
          label="Technical skills"
          suggestions={guidance?.technicalSkills ?? []}
          values={data.fieldValue.technicalSkills}
          onChange={(next) => patchFieldValue({ technicalSkills: next })}
        />
        <ChipField
          label="Software / CMMS"
          hint="ServiceTitan, Maximo, Corrigo, Building Engines, Yardi, Salesforce, mobile work-order systems."
          suggestions={SOFTWARE_EXAMPLES}
          values={data.fieldValue.software}
          onChange={(next) => patchFieldValue({ software: next })}
        />
        <ChipField
          label="Safety training"
          suggestions={SAFETY_TRAINING_EXAMPLES}
          values={data.fieldValue.safety}
          onChange={(next) => patchFieldValue({ safety: next })}
        />

        <div className="rb-field-grid rb-field-grid-2">
          <TextArea label="Education & apprenticeships" rows={3} maxLength={2500} value={data.education} onChange={(v) => update({ education: v })} placeholder="School, union or non-union apprenticeship, graduation year…" />
          <TextArea label="Other relevant details" rows={3} maxLength={2500} value={data.additionalDetails} onChange={(v) => update({ additionalDetails: v })} placeholder="Awards, languages, volunteer work, military experience…" />
        </div>
      </>
    );
  }

  function renderTargetJob() {
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>WHAT JOB ARE WE CHASING?</h1>
        <p className="rb-wiz-lead">
          Paste the posting and TRADE HUSTL3 prioritizes relevant language from your real experience.
          We match language. We do not manufacture experience.
        </p>
        <div className="rb-field-grid rb-field-grid-3">
          <Text label="Target job title" value={data.targetJob.title} onChange={(v) => patchTargetJob({ title: v })} required invalid={attemptedNext && !data.targetJob.title.trim()} placeholder="HVAC Service Technician" />
          <Text label="Target company" hint="Optional" value={data.targetJob.company} onChange={(v) => patchTargetJob({ company: v })} />
          <Text label="Target location" hint="Optional" value={data.targetJob.location} onChange={(v) => patchTargetJob({ location: v })} />
        </div>
        <TextArea
          label="Paste the job description"
          hint="Optional but strongly encouraged. The full posting works best."
          rows={10}
          maxLength={12000}
          value={data.targetJob.posting}
          onChange={(v) => patchTargetJob({ posting: v })}
        />
      </>
    );
  }

  function renderReview() {
    const roles = data.roles.filter(roleHasContent);
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>CHECK THE FACTS BEFORE WE BUILD.</h1>
        <p className="rb-wiz-lead rb-review-note">Nothing is generated yet. Make sure the facts are right first.</p>
        <div className="rb-summary">
          <SummaryCard title="Trade" onEdit={() => editStep(0)}>
            <p>{data.trade || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Experience level" onEdit={() => editStep(1)}>
            <p>{data.experienceLevel || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Contact" onEdit={() => editStep(2)}>
            <p>{data.contact.fullName || "—"}</p>
            <p>{[data.contact.phone, data.contact.cityState].filter(Boolean).join(" · ") || "—"}</p>
          </SummaryCard>
          <SummaryCard title="What employers should know" onEdit={() => editStep(2)}>
            <p className="rb-summary-long">{data.summaryNotes || "—"}</p>
          </SummaryCard>
          <SummaryCard title={`Work history (${roles.length})`} onEdit={() => editStep(2)}>
            {roles.length === 0 ? <p>No roles added — training and skills will carry the resume.</p> : null}
            {roles.map((role, index) => (
              <div className="rb-summary-role" key={index}>
                <strong>{[role.jobTitle, role.employer].filter(Boolean).join(" · ") || `Role ${index + 1}`}</strong>
                <span>{[role.location, roleDates(role)].filter(Boolean).join(" · ")}</span>
              </div>
            ))}
          </SummaryCard>
          <SummaryCard title="Certifications & licenses" onEdit={() => editStep(3)}>
            <p>{data.fieldValue.certifications.join(", ") || "—"}</p>
            {data.fieldValue.licenses ? <p className="rb-summary-long">{data.fieldValue.licenses}</p> : null}
          </SummaryCard>
          <SummaryCard title="Tools, equipment & skills" onEdit={() => editStep(3)}>
            <p>{[...data.fieldValue.tools, ...data.fieldValue.equipmentSystems, ...data.fieldValue.technicalSkills].join(", ") || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Software / CMMS" onEdit={() => editStep(3)}>
            <p>{data.fieldValue.software.join(", ") || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Safety training" onEdit={() => editStep(3)}>
            <p>{data.fieldValue.safety.join(", ") || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Education / apprenticeship" onEdit={() => editStep(3)}>
            <p className="rb-summary-long">{data.education || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Target role" onEdit={() => editStep(4)}>
            <p>{[data.targetJob.title, data.targetJob.company, data.targetJob.location].filter(Boolean).join(" · ") || "—"}</p>
          </SummaryCard>
          <SummaryCard title="Job description" onEdit={() => editStep(4)}>
            <p className="rb-summary-long">{data.targetJob.posting ? `${data.targetJob.posting.slice(0, 280)}${data.targetJob.posting.length > 280 ? "…" : ""}` : "Not pasted"}</p>
          </SummaryCard>
        </div>
      </>
    );
  }

  function renderGenerate() {
    return (
      <div className="rb-generate">
        <h1 ref={headingRef} tabIndex={-1}>READY TO TURN YOUR EXPERIENCE INTO A RESUME?</h1>
        <p className="rb-wiz-lead">Your first protected preview is built before checkout.</p>
        <div className="rb-value-reminder">
          <ul>
            <li><strong>$0</strong> to build your protected preview</li>
            <li>Review before paying</li>
            <li><strong>$9.99</strong> one-time to unlock clean PDF + DOCX</li>
            <li>3 corrections included</li>
            <li>No subscription</li>
          </ul>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------- helpers --
  function patchRole(index: number, patch: Partial<WizardData["roles"][number]>) {
    update((prev) => ({
      ...prev,
      roles: prev.roles.map((role, i) => (i === index ? { ...role, ...patch } : role)),
    }));
  }
  function patchFieldValue(patch: Partial<WizardData["fieldValue"]>) {
    update((prev) => ({ ...prev, fieldValue: { ...prev.fieldValue, ...patch } }));
  }
  function patchTargetJob(patch: Partial<WizardData["targetJob"]>) {
    update((prev) => ({ ...prev, targetJob: { ...prev.targetJob, ...patch } }));
  }
}

// ============================================================ subcomponents

function buildBody(data: WizardData, email: string) {
  return {
    trade: data.trade,
    title: data.targetJob.title.trim() || (data.trade ? `${data.trade} Resume` : ""),
    targetJobPosting: data.targetJob.posting.trim(),
    intake: toIntake(data, email),
  };
}

function validateStep(step: number, data: WizardData, paid: boolean, legalConsent: boolean): string[] {
  const errors: string[] = [];
  if (step === 0 && !isTradeTrack(data.trade)) errors.push("Choose the trade you want the resume built for.");
  if (step === 1 && !data.experienceLevel) errors.push("Pick the field-experience range that matches your real history.");
  if (step === 2) {
    if (!data.contact.fullName.trim()) errors.push("Add your full name.");
    if (!data.contact.phone.trim()) errors.push("Add a phone number employers can reach you at.");
    if (!data.contact.cityState.trim()) errors.push("Add your city and state.");
    if (!data.summaryNotes.trim()) errors.push("Tell us what an employer should know about you.");
  }
  if (step === 3 && !fieldValueHasContent(data.fieldValue)) {
    errors.push("Add at least one certification, tool, skill, or system you can back up.");
  }
  if (step === 4 && !data.targetJob.title.trim()) errors.push("Add the job title you are targeting.");
  if (step === 6 && !paid && !legalConsent) errors.push("Confirm you are 18+ and agree to the policies.");
  return errors;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

function WizardProgress({ step, percent, onJump }: { step: number; percent: number; onJump: (index: number) => void }) {
  return (
    <div className="rb-wiz-progress">
      <div className="rb-wiz-progress-head">
        <span>BUILD · {percent}% complete</span>
        <span>Step {step + 1} of {WIZARD_STEPS.length}</span>
      </div>
      <ol className="rb-wiz-dots">
        {WIZARD_STEPS.map((wizardStep, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          return (
            <li key={wizardStep.key} className={`rb-wiz-dot rb-wiz-dot-${state}`}>
              <button
                type="button"
                onClick={() => (index <= step ? onJump(index) : undefined)}
                aria-current={state === "current" ? "step" : undefined}
                disabled={index > step}
              >
                <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                <small>{wizardStep.label}</small>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ValueRail({ paid }: { paid: boolean }) {
  const items = paid
    ? ["Built for skilled trades", "Your facts stay attached to your verified account", "Payment and corrections unchanged"]
    : ["Built for skilled trades", "Preview before payment", "$9.99 one-time · no subscription", "3 corrections included", "PDF + DOCX after payment"];
  return (
    <div className="rb-value-rail" aria-label="What you get">
      <p>THE OFFER</p>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function SummaryCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rb-summary-card">
      <div className="rb-summary-card-head">
        <h2>{title}</h2>
        <button type="button" className="rb-text-button" onClick={onEdit}>Edit</button>
      </div>
      <div className="rb-summary-card-body">{children}</div>
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
  hint,
  required,
  invalid,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = useFieldId(label);
  return (
    <div className={classSet("rb-field", invalid && "rb-field-invalid")}>
      <label htmlFor={id}>{label}{hint ? <span> {hint}</span> : null}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={160}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  maxLength = 2000,
  required,
  invalid,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  const id = useFieldId(label);
  return (
    <div className={classSet("rb-field rb-field-wide", invalid && "rb-field-invalid")}>
      <label htmlFor={id}>{label}{hint ? <span> {hint}</span> : null}</label>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const id = useFieldId(label);
  return (
    <div className="rb-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function useFieldId(label: string): string {
  const base = useId();
  return `${base}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}
