import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const bytes = readFileSync('dist/server/index.js');
const gzipBytes = gzipSync(bytes).length;
// Enforce a conservative 3 MiB compressed script budget without assuming
// the production account plan. Report the larger paid-plan threshold too.
const report = { rawBytes: bytes.length, gzipBytes, freePlanLimitBytes: 3 * 1024 * 1024, paidPlanLimitBytes: 10 * 1024 * 1024 };
writeFileSync('docs/pr186/worker-size.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
if (gzipBytes >= report.freePlanLimitBytes) throw new Error('Worker exceeds conservative 3 MiB compressed limit');
