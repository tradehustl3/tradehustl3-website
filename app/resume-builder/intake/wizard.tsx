"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Hustl3Bot } from "../hustl3-bot";
import { TradeIcon } from "../resume-hero-texture";
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
import {
  LEGAL_CONSENT_ERROR,
  RESUME_UPLOAD_MAX_BYTES,
  extractResumeText,
  uploadContinueErrors,
  uploadStepErrors,
  uploadTextOutcome,
  mergeResumePrefill,
  recoverImportedResume,
  sourceFirstResumePrefill,
  resumeUploadKind,
  uploadedResumeIssues,
  type UploadedResumeIssue,
} from "./resume-upload";

import { createDraftSaver, UPLOAD_SAVE_DEBOUNCE_MS } from "./draft-save";
import { fieldStates, recordUserCorrections, uploadValues } from "./upload-field-state";

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
type ImportState = "idle" | "reading" | "analyzing" | "done" | "building" | "build-error" | "error";

const LAST_STEP = WIZARD_STEPS.length - 1;

function classSet(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function ResumeWizard() {
  const [user, setUser] = useState<User | null>(null);
  const [, setResumeId] = useState("");
  const [paid, setPaid] = useState(false);
  const [data, setData] = useState<WizardData>(emptyWizardData);
  const [step, setStep] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [importMessage, setImportMessage] = useState("");
  const [importConsent, setImportConsent] = useState(false);
  const [editingImportedDetails, setEditingImportedDetails] = useState(false);
  const [dragging, setDragging] = useState(false);
  const tradeGroupRef = useRef<HTMLDivElement | null>(null);

  const saveSequence = useRef(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [draftSaver] = useState(() => createDraftSaver(async (serialized, id) => {
    const response = await fetch(id ? `/api/resume-builder/resumes/${encodeURIComponent(id)}` : "/api/resume-builder/resumes", {
      method: id ? "PUT" : "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: serialized,
    });
    const result = await response.json() as { resumeId?: string; message?: string };
    if (!response.ok || !result.resumeId) throw new Error(result.message || "We could not save your progress.");
    setResumeId(result.resumeId);
    const url = new URL(window.location.href);
    url.searchParams.set("resume_id", result.resumeId);
    window.history.replaceState(null, "", url.toString());
    return result.resumeId;
  }));
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
        nextData = recoverImportedResume(nextData);
        const loadedUpload = nextData.sourceProvenance === "upload" && Boolean(nextData.sourceResumeText.trim());
        setData(nextData);
        setStep(loadedUpload ? 0 : Math.min(nextData.lastStep, LAST_STEP));
        if (loadedUpload) {
          setImportState("done");
          const issueCount = uploadedResumeIssues(nextData).length;
          setImportMessage(issueCount
            ? `We pulled your resume. ${issueCount} item${issueCount === 1 ? "" : "s"} need your confirmation before you continue.`
            : "We pulled the information from your resume. Nothing needs to be re-entered.");
        }
        draftSaver.hydrate(existingId, existingId ? JSON.stringify(buildBody(nextData, account.user.email)) : "");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "We could not load your workspace.");
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [draftSaver]);

  const update = useCallback((patch: Partial<WizardData> | ((prev: WizardData) => WizardData)) => {
    setData((prev) => {
      const next = recordUserCorrections(prev, typeof patch === "function" ? patch(prev) : { ...prev, ...patch });
      dataRef.current = next;
      return next;
    });
  }, []);

  // One serialized writer owns the draft ID; callers await their own snapshot.
  const persist = useCallback(async (next: WizardData): Promise<string | null> => {
    if (!user) return null;
    if (!isTradeTrack(next.trade) && next.sourceProvenance !== "upload") return null;
    const sequence = ++saveSequence.current;
    setSaveState("saving");
    try {
      const id = await draftSaver.save(JSON.stringify(buildBody(next, user.email)));
      if (sequence === saveSequence.current) { setSaveState("saved"); setError(""); }
      return id;
    } catch (saveError) {
      if (sequence === saveSequence.current) setSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "We could not save your progress.");
      return null;
    }
  }, [draftSaver, user]);

  async function persistLatest(lastStep: number): Promise<string | null> {
    let snapshot: WizardData;
    let id: string | null;
    do {
      snapshot = dataRef.current;
      id = await persist({ ...snapshot, lastStep });
      if (!id) return null;
    } while (snapshot !== dataRef.current);
    return id;
  }

  useEffect(() => {
    if (initializing || !user || importState === "reading" || importState === "analyzing" || importState === "building") return;
    // Imported edits save after a short pause (not per keystroke); Continue and
    // navigation still flush and await the latest snapshot via persistLatest.
    const timer = setTimeout(() => void persist({ ...dataRef.current, lastStep: step }), data.sourceProvenance === "upload" ? UPLOAD_SAVE_DEBOUNCE_MS : 1500);
    return () => clearTimeout(timer);
  }, [data, step, importState, initializing, user, persist]);

  useEffect(() => {
    if (saveState !== "saving" && saveState !== "error") return;
    const warnUnsaved = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => window.removeEventListener("beforeunload", warnUnsaved);
  }, [saveState]);

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
    if (!await persistLatest(Math.min(step + 1, LAST_STEP))) return;
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

  // "Start from scratch" is the guided path: with a trade chosen it is the same
  // as Continue; without one it points the customer at the trade choices.
  function startFromScratch() {
    if (isTradeTrack(data.trade)) {
      void goNext();
      return;
    }
    setAttemptedNext(true);
    tradeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    tradeGroupRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }

  async function submitBuild() {
    if (stepErrors.length) {
      setAttemptedNext(true);
      return;
    }
    setSubmitting(true);
    setError("");
    const id = await persistLatest(LAST_STEP);
    if (!id) {
      setSubmitting(false);
      setError("We could not save your intake. Check your connection and try again.");
      return;
    }
    window.location.assign(`/resume-builder/review?resume_id=${encodeURIComponent(id)}`);
  }

  async function importResume(file: File | null) {
    if (!file || importState === "reading" || importState === "analyzing" || importState === "building") return;
    if (dataRef.current.sourceProvenance === "upload" && !window.confirm("Replace the uploaded resume with this file? Your explicitly corrected or confirmed values will be kept.")) return;
    setImportMessage("");
    const kind = resumeUploadKind(file);
    if (!kind) {
      setImportState("error");
      setImportMessage("Choose a PDF or DOCX resume.");
      return;
    }
    if (file.size > RESUME_UPLOAD_MAX_BYTES) {
      setImportState("error");
      setImportMessage("That file is larger than 5 MB. Choose a smaller resume file.");
      return;
    }
    try {
      setImportState("reading");
      const text = await extractResumeText(file, kind);
      const outcome = uploadTextOutcome(text);
      if (outcome.route === "manual") {
        // Scanned/image-only file: no OCR. Keep the customer in the guided wizard.
        setImportState("error");
        setImportMessage(outcome.message);
        setEditingImportedDetails(true);
        setStep(0);
        return;
      }
      const sourcePrefill = sourceFirstResumePrefill(text);
      if (sourcePrefill) {
        const nextData = mergeResumePrefill(dataRef.current, sourcePrefill, text);
        const issueCount = uploadedResumeIssues(nextData).length;
        dataRef.current = nextData;
        setData(nextData);
        if (!await persist(nextData)) { setImportState("build-error"); setImportMessage("Your import is available below, but could not be saved. Retry saving before leaving this page."); return; }
        setEditingImportedDetails(false);
        setStep(0);
        setImportState("done");
        setImportMessage(issueCount
          ? `We found ${issueCount} item${issueCount === 1 ? "" : "s"} that need your confirmation. The other facts came from your resume.`
          : "Your resume facts are ready. Continue to choose your resume style.");
        return;
      }
      setImportState("analyzing");
      const response = await fetch("/api/resume-builder/resume-import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: kind, text }),
      });
      const result = (await response.json()) as { prefill?: unknown; message?: string };
      if (!response.ok || !result.prefill) {
        throw new Error(result.message || "HUSTL3 BOT could not read that resume.");
      }
      const nextData = mergeResumePrefill(dataRef.current, result.prefill, text);
      const issueCount = uploadedResumeIssues(nextData).length;
      dataRef.current = nextData;
      setData(nextData);
      if (!await persist(nextData)) { setImportState("build-error"); setImportMessage("Your import is available below, but could not be saved. Retry saving before leaving this page."); return; }
      setEditingImportedDetails(false);
      setStep(0);
      setImportState("done");
      setImportMessage(issueCount
        ? `Resume read. We found ${issueCount} item${issueCount === 1 ? "" : "s"} that need your confirmation. Everything else is already filled from the file.`
        : "Resume read. Your contact details, work history, trade direction, skills, certifications, and education were pulled from the file. Nothing needs to be re-entered.");
    } catch (importError) {
      setImportState("error");
      setImportMessage(importError instanceof Error ? importError.message : "HUSTL3 BOT could not read that resume.");
    }
  }

  async function continueImportedResume() {
    if (importState !== "done" && importState !== "build-error") return;
    const blockers = uploadContinueErrors(data, importConsent);
    if (blockers.issues.length) {
      setImportState("build-error");
      setImportMessage(`Fix the ${blockers.issues.length} highlighted item${blockers.issues.length === 1 ? "" : "s"} below. Everything else stays exactly as HUSTL3 BOT pulled it from your resume.`);
      return;
    }
    if (blockers.consent) {
      setImportState("build-error");
      setImportMessage("Check the agreement box before continuing to your resume-system choices.");
      return;
    }
    setImportState("building");
    setImportMessage("Resume facts verified. Opening your resume-system choices…");
    const id = await persistLatest(LAST_STEP);
    if (!id) {
      setImportState("build-error");
      setImportMessage("We could not save the imported resume. Check your connection and try again.");
      return;
    }
    window.location.assign(`/resume-builder/review?resume_id=${encodeURIComponent(id)}`);
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
  const uploadedResumeMode = data.sourceProvenance === "upload" && Boolean(data.sourceResumeText.trim());
  const uploadVerificationMode = uploadedResumeMode && !editingImportedDetails;
  const getStartedMode = step === 0 && !uploadedResumeMode;

  return (
    <div className="rb-wiz">
      {!uploadVerificationMode ? <WizardProgress step={step} percent={percent} onJump={editStep} /> : null}

      <div className={classSet("rb-wiz-shell", getStartedMode && "rb-wiz-shell-wide")}>
        <div className="rb-wiz-main">
          <p className="rb-kicker">{uploadVerificationMode ? "Resume upload · fix only what needs attention" : `Step ${step + 1} of ${WIZARD_STEPS.length}`}</p>

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
                I confirm this resume belongs to me, that the corrected information is accurate, and that I am at least 18 years old. I also agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>,{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>,{" "}
                <a href="/resume-builder/refund-policy" target="_blank" rel="noreferrer">Refund Policy</a>, and{" "}
                <a href="/resume-builder/ai-disclosure" target="_blank" rel="noreferrer">AI Disclosure</a>.
              </span>
            </label>
          ) : null}

          {!uploadVerificationMode ? (
          <div className="rb-wiz-nav">
            <button
              type="button"
              className="rb-button rb-button-ghost"
              onClick={goBack}
              disabled={step === 0 || submitting}
            >
              <span aria-hidden="true">←</span> Back
            </button>
            <span className="rb-save-state" data-state={saveState} aria-live="polite">
              {saveState === "saving" ? "Saving…" : null}
              {saveState === "saved" ? "Progress saved" : null}
              {saveState === "error" ? "Save failed — retrying" : null}
            </span>
            {step < 5 ? (
              <button type="button" className="rb-button rb-button-primary" onClick={() => void goNext()}>
                Continue <span aria-hidden="true">→</span>
              </button>
            ) : null}
            {step === 5 ? (
              <button type="button" className="rb-button rb-button-primary" onClick={() => void goNext()}>
                Review my info <span aria-hidden="true">→</span>
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
                  ? "Saving your intake…"
                  : paid
                    ? "Save & return to review"
                    : "Build my watermarked resume"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
          ) : null}
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
    const importBusy = importState === "reading" || importState === "analyzing" || importState === "building";
    const imported = uploadedResumeMode || importState === "done" || importState === "build-error" || importState === "building";

    if (uploadedResumeMode) {
      const issues = uploadedResumeIssues(data);
      const roleIssues = issues.filter((issue) => issue.kind === "role");
      const contactIssues = issues.filter((issue) => issue.kind === "contact");
      const needsTrade = issues.some((issue) => issue.kind === "trade");
      const needsHistory = issues.some((issue) => issue.kind === "history");
      const states = fieldStates(data);
      const values = uploadValues(data);
      // Low confidence: Confirm/Edit, never blocking. Conflicting optional values
      // (e.g. an unreadable end date) are flagged but do not block either; required
      // missing/conflicting values appear as the blocking issues above.
      const uncertain = Object.entries(states).filter(([, state]) => state.status === "low_confidence");
      const optionalConflicts = Object.entries(states).filter(([path, state]) => state.status === "conflicting" && !state.required
        && !issues.some((issue) => issue.roleIndex !== undefined && path === `roles.${issue.roleIndex}.${issue.field}`));
      const editStepFor = (path: string) => path.startsWith("roles.") || path.startsWith("contact.") || path === "summaryNotes" ? 2 : path === "trade" ? 0 : path === "experienceLevel" ? 1 : path.startsWith("targetJob.") ? 4 : 3;
      const issueBadge = (status: UploadedResumeIssue["status"]) => (
        <span className={`rb-upload-badge rb-upload-badge-${status}`}>{status === "conflicting" ? "Conflict · check this value" : "Missing · required"}</span>
      );
      const roleCount = data.roles.filter(roleHasContent).length;
      const skillCount = new Set([
        ...data.fieldValue.tools,
        ...data.fieldValue.equipmentSystems,
        ...data.fieldValue.technicalSkills,
        ...data.fieldValue.software,
      ].map((value) => value.trim()).filter(Boolean)).size;

      const renderRoleIssue = (issue: UploadedResumeIssue) => {
        const roleIndex = issue.roleIndex;
        if (roleIndex === undefined) return null;
        const role = data.roles[roleIndex];
        if (!role || !issue.field) return null;
        const labels: Record<string, string> = {
          employer: "Employer",
          jobTitle: "Job title",
          startDate: "Start date",
          endDate: "End date",
        };
        const field = issue.field as "employer" | "jobTitle" | "startDate" | "endDate";
        return (
          <div className={`rb-upload-issue rb-upload-issue-${issue.status}`} data-status={issue.status} key={issue.id}>
            {issueBadge(issue.status)}
            <p>{field === "endDate" && issue.id.endsWith("date-order") ? "This job shows an end date earlier than the start date. Review the dates below and correct them." : issue.message}</p>
            {issue.id.endsWith("date-order") ? <Text label={`Start date · Job ${roleIndex + 1}`} value={role.startDate} onChange={(value) => patchRole(roleIndex, { startDate: value })} placeholder="Example: Jan 2022" invalid /> : null}
            <Text
              label={`${labels[field]} · Job ${roleIndex + 1}`}
              value={role[field]}
              onChange={(value) => patchRole(roleIndex, { [field]: value })}
              invalid
              placeholder={field === "startDate" ? "Example: Jan 2022" : field === "endDate" ? "Example: Aug 2024" : undefined}
            />
          </div>
        );
      };

      return (
        <>
          <h1 ref={headingRef} tabIndex={-1}>We read your resume. <span>{issues.length ? "Now let’s fix a few things." : "No need to re-type it."}</span></h1>
          <p className="rb-wiz-lead">
            {issues.length
              ? "HUSTL3 BOT pulled the information from your uploaded resume. A few details need your confirmation before you continue. Everything else is already filled in."
              : "HUSTL3 BOT pulled the information from your uploaded resume. Review the details below, then continue to your resume style options."}
          </p>

          <section className="rb-upload-result" aria-labelledby="upload-result-title">
            <div className="rb-upload-result-head">
              <div>
                <p className="rb-resume-import-kicker">Resume import complete</p>
                <h2 id="upload-result-title">{issues.length ? "Almost ready. Just verify a few details." : "Your resume is ready for the next step."}</h2>
              </div>
              <span className={issues.length ? "rb-upload-result-count rb-upload-result-count-warn" : "rb-upload-result-count"}>
                {issues.length ? "Action needed" : "Ready"}
              </span>
            </div>

            <div className="rb-upload-snapshot" aria-label="Information pulled from your resume">
              <div><span>Name</span><strong>{data.contact.fullName || "Needs confirmation"}</strong></div>
              <div><span>Trade direction</span><strong>{data.trade || "Needs confirmation"}</strong></div>
              <div><span>Jobs found</span><strong>{roleCount}</strong></div>
              <div><span>Certifications</span><strong>{data.fieldValue.certifications.length}</strong></div>
              <div><span>Technical items</span><strong>{skillCount}</strong></div>
              <div><span>Education / training</span><strong>{data.education.trim() ? "Found" : "Not listed"}</strong></div>
            </div>

            {importMessage && (!issues.length || importState === "build-error") ? (
              <p className={issues.length ? "rb-resume-import-error" : "rb-resume-import-success"} role="status">
                {importMessage}
              </p>
            ) : null}

            {issues.length ? (
              <div className="rb-upload-exceptions">
                <p className="rb-resume-import-error">We found a few details that need review before we can move to your resume style options.</p>
                <p>{`We found ${issues.length} item${issues.length === 1 ? "" : "s"} that need${issues.length === 1 ? "s" : ""} your confirmation before you continue.`}</p>
                <div className="rb-upload-exceptions-head">
                  <strong>Fix only these items</strong>
                  <p>You do not need to re-enter your full resume. Only review the items shown below.</p>
                </div>

                {needsTrade ? (
                  <div className="rb-upload-issue rb-upload-issue-missing" data-status="missing">
                    {issueBadge("missing")}
                    <h3>Choose your target trade or job title</h3>
                    <Text label="Target job title" value={data.targetJob.title} onChange={(title) => update((prev) => ({ ...prev, targetJob: { ...prev.targetJob, title } }))} />
                    <p>Your resume shows experience across more than one area. Choose the trade direction you want this resume to target.</p>
                    <p>This helps HUSTL3 BOT build the strongest version of your resume.</p>
                    <div className="rb-trade-grid" role="radiogroup" aria-label="Trade track">
                      {TRADE_TRACKS.map((trade) => {
                        const selected = data.trade === trade;
                        return (
                          <button
                            type="button"
                            key={trade}
                            role="radio"
                            aria-checked={selected}
                            className={classSet("rb-trade-card", "rb-trade-card-row", selected && "rb-trade-card-on")}
                            onClick={() => update({ trade })}
                          >
                            <TradeIcon trade={trade} />
                            <span>
                              <span className="rb-trade-card-name">{trade}</span>
                              <span className="rb-trade-card-note">{TRADE_GUIDANCE[trade].tagline}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {contactIssues.map((issue) => (
                  <div className={`rb-upload-issue rb-upload-issue-${issue.status}`} data-status={issue.status} key={issue.id}>
                    {issueBadge(issue.status)}
                    <p>{issue.message}</p>
                    {issue.field === "fullName" ? (
                      <Text label="Full name" value={data.contact.fullName} onChange={(value) => update((prev) => ({ ...prev, contact: { ...prev.contact, fullName: value } }))} invalid autoComplete="name" />
                    ) : null}
                    {issue.field === "phone" ? (
                      <>
                        <Text label="Phone number (or email below)" value={data.contact.phone} onChange={(value) => update((prev) => ({ ...prev, contact: { ...prev.contact, phone: value } }))} autoComplete="tel" />
                        <Text label="Email (or phone above)" value={data.contact.email ?? ""} onChange={(value) => update((prev) => ({ ...prev, contact: { ...prev.contact, email: value } }))} autoComplete="email" />
                      </>
                    ) : null}
                    {issue.field === "cityState" ? (
                      <Text label="City + state" value={data.contact.cityState} onChange={(value) => update((prev) => ({ ...prev, contact: { ...prev.contact, cityState: value } }))} invalid autoComplete="address-level2" />
                    ) : null}
                  </div>
                ))}

                {roleIssues.map(renderRoleIssue)}
                {needsHistory ? (
                  <div className="rb-upload-issue rb-upload-issue-missing" data-status="missing">
                    {issueBadge("missing")}
                    <h3>Add or confirm your work history</h3>
                    <p>We were not able to pull enough work-history detail from your upload. Add or confirm your job information below so we can continue.</p>
                    <Text label="Employer" value={data.roles[0]?.employer ?? ""} onChange={(value) => patchRole(0, { employer: value })} />
                    <Text label="Job title" value={data.roles[0]?.jobTitle ?? ""} onChange={(value) => patchRole(0, { jobTitle: value })} />
                    <Text label="Start date" value={data.roles[0]?.startDate ?? ""} onChange={(value) => patchRole(0, { startDate: value })} placeholder="Example: Jan 2022" />
                    <Text label="End date" value={data.roles[0]?.endDate ?? ""} onChange={(value) => patchRole(0, { endDate: value })} placeholder="Example: Aug 2024" />
                    <label className="rb-check"><input type="checkbox" checked={data.roles[0]?.current ?? false} onChange={(event) => patchRole(0, { current: event.target.checked, endDate: event.target.checked ? "" : data.roles[0]?.endDate ?? "" })} /> This is my current role</label>
                  </div>
                ) : null}
                <div className="rb-upload-clean"><strong>You do not have to start over.</strong><p>Everything not shown here has already been pulled from your resume. Only fix the items listed on this screen.</p></div>
              </div>
            ) : (
              <div className="rb-upload-clean">
                <strong>✓ No re-typing required</strong>
                <p>Your resume supplied the information needed for the next step. You can review all extracted facts if you want, but it is not required.</p>
              </div>
            )}

            {optionalConflicts.length > 0 ? (
              <div className="rb-upload-conflicts" role="note">
                <strong>Check these values (optional)</strong>
                {optionalConflicts.map(([path]) => (
                  <div className="rb-upload-issue rb-upload-issue-conflicting" data-status="conflicting" key={path}>
                    {issueBadge("conflicting")}
                    <p>{uploadFieldLabel(path)}: “{String(values[path])}” could not be read as a date. It will not block your resume.</p>
                    <button type="button" className="rb-text-link" onClick={() => { setEditingImportedDetails(true); setStep(editStepFor(path)); }}>Edit</button>
                  </div>
                ))}
              </div>
            ) : null}
            {uncertain.length > 0 ? <details className="rb-upload-confirmations">
              <summary>Confirm {uncertain.length} extracted detail{uncertain.length === 1 ? "" : "s"} (optional)</summary>
              {uncertain.map(([path]) => <div className="rb-upload-low-confidence" data-status="low_confidence" key={path}>
                <span className="rb-upload-badge rb-upload-badge-low">Please confirm</span>
                <span>{uploadFieldLabel(path)}: {Array.isArray(values[path]) ? (values[path] as string[]).join(", ") : String(values[path])}</span>{" "}
                <button type="button" onClick={() => setData((prev) => {
                  const next = recordUserCorrections(prev, prev, [path]); dataRef.current = next; return next;
                })}>Confirm</button>{" "}
                <button type="button" onClick={() => { setEditingImportedDetails(true); setStep(editStepFor(path)); }}>Edit</button>
              </div>)}
            </details> : null}
            {saveState === "error" ? <button type="button" className="rb-button rb-button-secondary" onClick={() => void persistLatest(step)}>Retry saving</button> : null}
            <label className="rb-legal-consent rb-resume-import-consent">
              <input
                type="checkbox"
                checked={importConsent}
                onChange={(event) => setImportConsent(event.target.checked)}
                disabled={importBusy}
              />
              <span>
                I confirm this resume belongs to me, that the corrected information is accurate, and that I am at least 18 years old. I also agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms</a>,{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>, and{" "}
                <a href="/resume-builder/ai-disclosure" target="_blank" rel="noreferrer">AI Disclosure</a>.
              </span>
            </label>

            <div className="rb-resume-import-actions">
              <button
                type="button"
                className="rb-button rb-button-primary"
                onClick={() => void continueImportedResume()}
                disabled={importBusy}
              >
                {importState === "building" ? "Saving verified facts…" : issues.length ? "Save and continue" : "Choose my resume system"} <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="rb-button rb-button-ghost"
                onClick={() => {
                  setEditingImportedDetails(true);
                  setStep(5);
                }}
                disabled={importBusy}
              >
                Review imported details <span aria-hidden="true">→</span>
              </button>
            </div>

            <label className={classSet("rb-button", "rb-button-ghost", "rb-resume-import-button", importBusy && "rb-resume-import-busy")}>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void importResume(file);
                }}
                disabled={importBusy}
              />
              Upload a different resume
            </label>
          </section>
        </>
      );
    }

    const acceptFile = (file: File | null) => {
      setDragging(false);
      void importResume(file);
    };

    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>How do you want to start?</h1>
        <p className="rb-wiz-lead">Upload the resume you already have and we will pull the facts from it, or start from scratch with the guided intake.</p>
        <div className="rb-start-grid">
          <section className="rb-start-upload" aria-labelledby="upload-title">
            <label
              className="rb-upload-zone"
              data-dragging={dragging}
              data-busy={importBusy}
              onDragOver={(event) => {
                event.preventDefault();
                if (!importBusy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                if (importBusy) {
                  setDragging(false);
                  return;
                }
                acceptFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  acceptFile(file);
                }}
                disabled={importBusy}
              />
              <span className="rb-upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                  <path d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
                </svg>
              </span>
              <strong id="upload-title">Upload your existing resume</strong>
              <p>
                Drag and drop your file here, or choose it from your device. HUSTL3 BOT reads your contact details, work
                history, dates, trade direction, skills, certifications, and education, then shows only what needs fixing.
              </p>
              <span className={classSet("rb-button", "rb-button-primary", importBusy && "rb-resume-import-busy")}>
                {importState === "reading"
                  ? "Reading file…"
                  : importState === "analyzing"
                    ? "HUSTL3 BOT is reading your resume…"
                    : imported
                      ? "Upload a different resume"
                      : "Upload resume"}
              </span>
              <small className="rb-upload-rules">PDF or DOCX · 5 MB maximum · original file is not stored</small>
              {importMessage ? (
                <span className={importState === "done" ? "rb-resume-import-success" : "rb-resume-import-error"} role="status">
                  {importMessage}
                </span>
              ) : null}
            </label>
            <p className="rb-or-divider"><span>OR</span></p>
            <button type="button" className="rb-button rb-button-secondary" onClick={startFromScratch} disabled={importBusy}>
              Start from scratch
            </button>
            <p className="rb-section-hint">Answer a few guided questions about your trade and field experience.</p>
          </section>

          <section className="rb-start-trades" aria-labelledby="trade-select-title">
            <h2 className="rb-section-title" id="trade-select-title">Choose the trade you want to target</h2>
            <p className="rb-section-hint">Required to start from scratch. Optional for uploads — HUSTL3 BOT detects your trade from the resume and uses this choice only if it can’t.</p>
            <div className="rb-trade-grid" role="radiogroup" aria-labelledby="trade-select-title" ref={tradeGroupRef}>
              {TRADE_TRACKS.map((trade) => {
                const selected = data.trade === trade;
                return (
                  <button
                    type="button"
                    key={trade}
                    role="radio"
                    aria-checked={selected}
                    className={classSet("rb-trade-card", "rb-trade-card-row", selected && "rb-trade-card-on")}
                    onClick={() => update({ trade })}
                  >
                    <TradeIcon trade={trade} />
                    <span>
                      <span className="rb-trade-card-name">{trade}</span>
                      <span className="rb-trade-card-note">{TRADE_GUIDANCE[trade].tagline}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </>
    );
  }
  function renderExperience() {
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>How much field experience are we working with?</h1>
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
        <h1 ref={headingRef} tabIndex={-1}>What have you actually done?</h1>
        <p className="rb-wiz-lead">
          Add every role that shows trade skill — employer jobs, self-employment, contract, apprentice, helper,
          school lab, military, volunteer, or side work. No employment yet? Leave the roles blank and lean on your
          training and skills.
        </p>

        <fieldset className="rb-wiz-contact">
          <legend>Your details</legend>
          <div className="rb-field-grid rb-field-grid-3">
            <Text label="Full name" value={data.contact.fullName} onChange={(v) => update((p) => ({ ...p, contact: { ...p.contact, fullName: v } }))} required invalid={attemptedNext && !data.contact.fullName.trim()} autoComplete="name" />
            <Text label="Phone number" value={data.contact.phone} onChange={(v) => update((p) => ({ ...p, contact: { ...p.contact, phone: v } }))} required invalid={attemptedNext && !data.contact.phone.trim()} autoComplete="tel" placeholder="(555) 555-0123" />
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
          <span aria-hidden="true">+</span> Add another role
        </button>
      </>
    );
  }

  function renderFieldValue() {
    const guidance = data.trade ? TRADE_GUIDANCE[data.trade] : null;
    return (
      <>
        <h1 ref={headingRef} tabIndex={-1}>What can you do that employers care about?</h1>
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
          label="Which of these have you actually performed?"
          hint="Select only work you have personally performed. Common trade duties are suggestions—not automatic claims."
          suggestions={dedupe([...(guidance?.dutyCategories ?? []), ...(guidance?.technicalSkills ?? [])])}
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
        <h1 ref={headingRef} tabIndex={-1}>What job are we chasing?</h1>
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
        <h1 ref={headingRef} tabIndex={-1}>Check the facts before we build.</h1>
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
        <h1 ref={headingRef} tabIndex={-1}>Ready to turn your experience into a resume?</h1>
        <p className="rb-wiz-lead">Your first protected preview is built before checkout.</p>
        <div className="rb-value-reminder">
          <ul>
            <li><strong>$0</strong> to build your protected preview</li>
            <li>Review before paying</li>
            <li><strong>$9.99</strong> one-time for the resume + matching cover letter in PDF + DOCX</li>
            <li>3 shared corrections included</li>
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
      roles: (prev.roles.length ? prev.roles : [emptyRole()]).map((role, i) => (i === index ? { ...role, ...patch } : role)),
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

function meaningfulIntakeText(value: string, minimumWords = 2): boolean {
  return value.trim().split(/\s+/).filter(Boolean).length >= minimumWords;
}

function finalSubstanceErrors(data: WizardData): string[] {
  const uploadWords = data.sourceResumeText.trim().split(/\s+/).filter(Boolean).length;
  if (data.sourceProvenance === "upload" && data.sourceResumeText.trim().length >= 80 && uploadWords >= 12) return [];

  const listedRoles = data.roles.filter(roleHasContent);
  const roleDetails = (role: WizardData["roles"][number]) => [
    role.responsibilities,
    role.equipment,
    role.systems,
    role.workPerformed,
    role.leadership,
    role.workOrders,
    role.measurable,
  ].filter((value) => meaningfulIntakeText(value)).length;
  const documentedRole = listedRoles.some((role) => role.jobTitle.trim() && roleDetails(role) > 0);
  const incompleteRole = listedRoles.some((role) => role.jobTitle.trim() && roleDetails(role) === 0);
  const practicalEvidence = new Set([
    ...data.fieldValue.tools,
    ...data.fieldValue.equipmentSystems,
    ...data.fieldValue.technicalSkills,
    ...data.fieldValue.software,
    ...data.fieldValue.safety,
    ...listedRoles.flatMap((role) => [
      role.responsibilities,
      role.equipment,
      role.systems,
      role.workPerformed,
      role.leadership,
      role.workOrders,
      role.measurable,
    ]),
  ].map((value) => value.trim().toLowerCase()).filter((value) => meaningfulIntakeText(value)));
  const hasTraining = meaningfulIntakeText(data.education);
  const hasNarrative = meaningfulIntakeText(data.summaryNotes, 8) || meaningfulIntakeText(data.additionalDetails, 6);
  const errors: string[] = [];

  if (incompleteRole) errors.push("Add at least one specific duty, task, or accomplishment for each listed job.");
  if (!documentedRole && !(hasTraining || hasNarrative)) {
    errors.push("Add a job, apprenticeship, school or lab project, hands-on training, or a specific experience description.");
  }
  if (!documentedRole && practicalEvidence.size < 2) {
    errors.push("Add at least two real tools, systems, technical or safety skills, or tasks you can perform.");
  }
  return errors;
}

function validateStep(step: number, data: WizardData, paid: boolean, legalConsent: boolean): string[] {
  const errors: string[] = [];
  if (data.sourceProvenance === "upload") return uploadStepErrors(step, data, paid, legalConsent);
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
  if (step === 6) errors.push(...finalSubstanceErrors(data));
  if (step === 6 && !paid && !legalConsent) errors.push(LEGAL_CONSENT_ERROR);
  return errors;
}

function uploadFieldLabel(path: string): string {
  const role = path.match(/^roles\.(\d+)\.(\w+)$/);
  const names: Record<string, string> = {
    employer: "employer", jobTitle: "job title", location: "location", startDate: "start date", endDate: "end date", current: "current role",
    "contact.fullName": "Full name", "contact.email": "Email", "contact.phone": "Phone", "contact.cityState": "City + state",
    trade: "Trade", "targetJob.title": "Target job title", "fieldValue.certifications": "Certifications",
    "fieldValue.licenses": "Licenses", education: "Education",
  };
  return role ? `Job ${Number(role[1]) + 1} ${names[role[2]] ?? role[2]}` : names[path] ?? path;
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
        <span>{WIZARD_STEPS[step].label}</span>
        <span>Step {step + 1} of {WIZARD_STEPS.length} · {percent}% complete</span>
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
    : ["Built for skilled trades", "Preview before payment", "$9.99 one-time · no subscription", "Resume + cover letter", "PDF + DOCX", "3 shared corrections"];
  return (
    <div className="rb-value-rail" aria-label="What you get">
      <p>What you get</p>
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
