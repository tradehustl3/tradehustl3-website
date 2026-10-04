import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// React sets a synthetic event's currentTarget back to null as soon as the handler
// yields. Reading `event.currentTarget` after an `await` therefore throws
// "Cannot read properties of null (reading 'reset')" after the server work has
// already succeeded: the correction is spent, yet the customer sees an error
// (cover letter) or an uncaught exception and an uncleared form (resume).

/** 1-based lines where `<x>.currentTarget` is read after an `await` in the same async function. */
function currentTargetAfterAwait(source: string, fileName = "source.tsx"): number[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: number[] = [];

  const isFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node);

  function checkAsync(fn: ts.FunctionLikeDeclaration) {
    if (!fn.body || !(ts.getCombinedModifierFlags(fn as ts.Declaration) & ts.ModifierFlags.Async)) return;
    let firstAwaitEnd = Number.POSITIVE_INFINITY;
    const reads: ts.Node[] = [];
    const walk = (node: ts.Node) => {
      if (node !== fn && isFunctionLike(node)) return; // nested functions are checked on their own
      if (ts.isAwaitExpression(node) || (ts.isForOfStatement(node) && node.awaitModifier)) {
        firstAwaitEnd = Math.min(firstAwaitEnd, node.getEnd());
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === "currentTarget") reads.push(node);
      ts.forEachChild(node, walk);
    };
    ts.forEachChild(fn, walk);
    for (const read of reads) {
      if (read.getStart(file) > firstAwaitEnd) findings.push(file.getLineAndCharacterOfPosition(read.getStart(file)).line + 1);
    }
  }

  const visit = (node: ts.Node) => {
    if (isFunctionLike(node)) checkAsync(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return findings;
}

async function sourceFiles(dir: URL): Promise<URL[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
    if (entry.isDirectory()) return sourceFiles(child);
    return Promise.resolve(/\.tsx?$/.test(entry.name) ? [child] : []);
  }));
  return nested.flat();
}

test("the guard catches the shipped resume and cover-letter reset bugs", () => {
  // The two handlers exactly as they shipped before this fix.
  const shipped = `
    async function submitCorrection(event) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const correction = String(form.get("correctionRequest") ?? "").trim();
      if (!correction) return;
      const applied = await runGeneration(correction);
      if (applied) event.currentTarget.reset();
    }
    async function submit(event, correction = false) {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/x", { method: "POST" });
        await onRefresh();
        onMessage("Matching cover letter updated.", "success");
        event.currentTarget.reset();
      } catch (error) {
        onMessage(String(error), "error");
      }
    }
    const onSubmit = async (event) => { await save(); event.currentTarget.reset(); };
  `;
  assert.deepEqual(currentTargetAfterAwait(shipped), [8, 17, 22]);

  const fixed = `
    async function submitCorrection(event) {
      event.preventDefault();
      const formElement = event.currentTarget;
      if (await runGeneration("x")) formElement.reset();
    }
  `;
  assert.deepEqual(currentTargetAfterAwait(fixed), []);
});

test("no app handler reads event.currentTarget after an await", async () => {
  const files = await sourceFiles(new URL("../app/", import.meta.url));
  assert.ok(files.length > 20, "expected to scan the app source tree");
  const violations: string[] = [];
  for (const file of files) {
    const lines = currentTargetAfterAwait(await readFile(file, "utf8"), file.pathname);
    for (const line of lines) violations.push(`${file.pathname.split("/app/")[1]}:${line}`);
  }
  assert.deepEqual(violations, []);
});

test("both review forms capture the form element before awaiting and reset that element", async () => {
  for (const path of ["../app/resume-builder/review/resume-review.tsx", "../app/resume-builder/review/cover-letter-panel.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/, path);
    const capture = source.indexOf("const formElement = event.currentTarget;");
    const firstAwait = source.indexOf("await ", capture);
    assert.ok(capture > 0 && firstAwait > capture, `${path} must capture the form before awaiting`);
    assert.match(source, /formElement\.reset\(\)/, path);
  }
});

test("a successful cover-letter generation resets the form before reporting success, not after", async () => {
  const source = await readFile(new URL("../app/resume-builder/review/cover-letter-panel.tsx", import.meta.url), "utf8");
  const refresh = source.indexOf("await onRefresh();");
  const reset = source.indexOf("formElement.reset();", refresh);
  const success = source.indexOf('onMessage(result.message || "Matching cover letter updated.", "success");', refresh);
  assert.ok(refresh > 0 && reset > refresh && success > reset);
});
