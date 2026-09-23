import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mammoth from "mammoth";
import { isTradeTrack, type TradeTrack } from "../app/resume-builder/trade-content";
import { runResumeCalibration } from "./lib/resume-calibration";

type Arguments = {
  input: string;
  output: string;
  trade?: TradeTrack;
  title?: string;
  targetJobPosting?: string;
};

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function parseArguments(argv: string[]): Arguments {
  const input = optionValue(argv, "--input");
  const output = optionValue(argv, "--output");
  const tradeValue = optionValue(argv, "--trade");
  if (!input || !output) {
    throw new Error("Usage: npm run calibrate:resume -- --input resume.docx --output test-results [--trade \"Facilities Maintenance\"] [--title \"Building Equipment Mechanic\"]");
  }
  if (tradeValue && !isTradeTrack(tradeValue)) throw new Error(`Unsupported trade: ${tradeValue}`);
  return {
    input: path.resolve(input),
    output: path.resolve(output),
    trade: tradeValue as TradeTrack | undefined,
    title: optionValue(argv, "--title"),
    targetJobPosting: optionValue(argv, "--target-job-posting"),
  };
}

function calibrationEnvironment() {
  if (process.env.CALIBRATION_MODE !== "1") throw new Error("Set CALIBRATION_MODE=1 to run calibration.");
  if (process.env.NODE_ENV === "production" || process.env.CF_PAGES === "1" || process.env.CLOUDFLARE_DEPLOYMENT_ID) {
    throw new Error("Calibration is local-only and cannot run in a production or deployment process.");
  }
  return {
    // Calibration calls only the pure extraction/generation entrypoints. A D1
    // binding is required by the shared environment type but is never touched.
    DB: {} as D1Database,
    CALIBRATION_MODE: "1",
    RESUME_AI_PROVIDER: process.env.RESUME_AI_PROVIDER,
    RESUME_AI_BRIDGE_URL: process.env.RESUME_AI_BRIDGE_URL,
    RESUME_AI_BRIDGE_SECRET: process.env.RESUME_AI_BRIDGE_SECRET,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
  };
}

const args = parseArguments(process.argv.slice(2));
if (path.extname(args.input).toLowerCase() !== ".docx") {
  throw new Error("The calibration runner currently accepts text-based DOCX originals.");
}
const bytes = await readFile(args.input);
const extracted = await mammoth.extractRawText({ buffer: bytes });
const sourceText = extracted.value.trim();
if (sourceText.length < 80) throw new Error("The DOCX did not contain enough readable resume text.");

const result = await runResumeCalibration(calibrationEnvironment(), {
  fileName: path.basename(args.input),
  sourceText,
  trade: args.trade,
  title: args.title,
  targetJobPosting: args.targetJobPosting,
});
await mkdir(args.output, { recursive: true });
await Promise.all([
  writeFile(path.join(args.output, "generated-resume.docx"), result.files.docx),
  writeFile(path.join(args.output, "generated-resume.pdf"), result.files.pdf),
  writeFile(path.join(args.output, "generated-resume-preview.pdf"), result.files.preview),
  writeFile(path.join(args.output, "generated-resume.json"), `${JSON.stringify(result.resume, null, 2)}\n`, "utf8"),
  writeFile(path.join(args.output, "extracted-prefill.json"), `${JSON.stringify(result.prefill, null, 2)}\n`, "utf8"),
  writeFile(path.join(args.output, "qa-report.json"), `${JSON.stringify({
    sourceFile: path.basename(args.input),
    trade: args.trade ?? result.prefill.trade,
    title: args.title ?? result.prefill.targetJobTitle,
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    guardFlags: result.guardFlags,
    extraction: result.extraction,
    qualityScore: result.qualityScore,
  }, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
  ok: true,
  output: args.output,
  model: result.model,
  guardFlags: result.guardFlags.length,
  extractionReady: result.extraction.ready,
  reconciled: result.extraction.reconciled,
}, null, 2));
