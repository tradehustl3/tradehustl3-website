// TEMPORARY diagnostic: runs the test suite and re-emits each failing test as a
// GitHub Actions error annotation. Exit code is the test runner's exit code.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";

const files = readdirSync("tests").filter((name) => /\.test\.(mjs|ts)$/.test(name)).sort().map((name) => `tests/${name}`);
const child = spawn(process.execPath, ["--import", "tsx", "--test", "--test-reporter=tap", ...files], {
  stdio: ["ignore", "pipe", "inherit"],
});
let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk;
  process.stdout.write(chunk);
});
child.on("close", (code) => {
  const lines = output.split("\n");
  let emitted = 0;
  for (let i = 0; i < lines.length && emitted < 20; i += 1) {
    const match = /^\s*not ok \d+ - (.*)$/.exec(lines[i]);
    if (!match) continue;
    const detail = lines.slice(i + 1, i + 40).filter((line) => /error|expected|actual|message|at |code|location|Assertion/i.test(line));
    const body = detail.slice(0, 18).join("\n").replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
    console.log(`::error title=${match[1].slice(0, 120).replace(/[:,]/g, " ")}::${body}`);
    emitted += 1;
  }
  process.exit(code ?? 1);
});
