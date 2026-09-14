import { emptyWizardData, toIntake } from "../../app/resume-builder/intake/wizard-data";
import { mergeResumePrefill } from "../../app/resume-builder/intake/resume-upload";
import { isTradeTrack, type TradeTrack } from "../../app/resume-builder/trade-content";
import {
  extractResumeFactsForCalibration,
  generateResumeForCalibration,
  type ResumeBuilderDependencies,
  type ResumeBuilderEnv,
  type ResumeCalibrationCoreResult,
} from "../../worker/resume-builder-base";
import {
  preservationDependencies,
  reconciliationDependencies,
} from "../../worker/resume-builder";
import { assessResumeExtractionCoverage } from "../../worker/resume-extraction-coverage";

export type ResumeCalibrationInput = {
  fileName: string;
  sourceText: string;
  trade?: TradeTrack;
  title?: string;
  targetJobPosting?: string;
};

export type ResumeCalibrationResult = ResumeCalibrationCoreResult & {
  prefill: Record<string, unknown>;
  intake: Record<string, unknown>;
  extraction: ReturnType<typeof assessResumeExtractionCoverage> & { reconciled: boolean };
};

function withImportedContact(prefill: Record<string, unknown>, sourceText: string): Record<string, unknown> {
  const contactValue = prefill.contact;
  const contact = contactValue && typeof contactValue === "object" && !Array.isArray(contactValue)
    ? { ...(contactValue as Record<string, unknown>) }
    : {};
  const email = sourceText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0]?.trim();
  const phone = sourceText.match(/(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/)?.[0]
    ?.replace(/\s+/g, " ").trim();
  if (email) contact.email = email;
  if (!contact.phone && phone) contact.phone = phone;
  return { ...prefill, contact };
}

export async function runResumeCalibration(
  env: ResumeBuilderEnv,
  input: ResumeCalibrationInput,
  dependencies: ResumeBuilderDependencies = {},
): Promise<ResumeCalibrationResult> {
  if (env.CALIBRATION_MODE?.trim() !== "1") {
    throw new Error("Resume calibration is disabled. Set CALIBRATION_MODE=1 locally.");
  }
  const sourceText = input.sourceText.trim();
  let prefill = await extractResumeFactsForCalibration(
    env,
    sourceText,
    preservationDependencies(dependencies, false),
  );
  let extraction = assessResumeExtractionCoverage(sourceText, prefill);
  let reconciled = false;
  if (!extraction.ready) {
    prefill = await extractResumeFactsForCalibration(
      env,
      sourceText,
      reconciliationDependencies(dependencies),
    );
    extraction = assessResumeExtractionCoverage(sourceText, prefill);
    reconciled = true;
  }
  if (!extraction.ready) {
    throw new Error(`Calibration extraction failed coverage checks: ${extraction.issues.map((issue) => issue.message).join("; ")}`);
  }

  prefill = withImportedContact(prefill, sourceText);
  const wizard = mergeResumePrefill(emptyWizardData(), prefill, sourceText);
  const trade = input.trade ?? wizard.trade;
  if (!trade || !isTradeTrack(trade)) throw new Error("The resume trade could not be determined. Pass --trade explicitly.");
  wizard.trade = trade;
  wizard.lastStep = 6;
  if (input.title?.trim()) wizard.targetJob.title = input.title.trim();
  const title = wizard.targetJob.title.trim() || `${trade} Resume`;
  const intake = toIntake(wizard, wizard.contact.email ?? "");
  const generated = await generateResumeForCalibration(
    env,
    {
      sourceText,
      fileName: input.fileName,
      trade,
      title,
      intake,
      targetJobPosting: input.targetJobPosting,
      theme: "plain",
    },
    preservationDependencies(dependencies, false),
  );
  return {
    ...generated,
    prefill,
    intake,
    extraction: { ...extraction, reconciled },
  };
}
