from pathlib import Path

p = Path('tests/resume-builder-generation-safety.test.ts')
s = p.read_text()
old = '''test("unsupported numeric claims return sanitized telemetry and an intake action", async () => {\n  const h = harness();\n  const inflated = { ...entryLevelResume, summary: "Reduced callbacks by 35 percent across service visits." };\n  const { response, payload } = await run(h, dependenciesFor(inflated));\n  assert.equal(response.status, 422);\n  assert.equal(payload.code, "UNSUPPORTED_NUMERIC_CLAIM");\n  assert.equal(payload.retryable, false);\n  assert.deepEqual(payload.missing, ["measurable results, dates, and quantities"]);\n  assert.equal(h.state.creditsUsed, 0);\n  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));\n  assert.ok(generation);\n  const flags = String(generation.values[5]);\n  assert.match(flags, /"count":1/);\n  assert.match(flags, /career summary/);\n  assert.doesNotMatch(flags, /35/);\n});'''
new = '''test("unsupported numeric wording removed by deterministic repair completes without another customer build", async () => {\n  const h = harness();\n  const inflated = { ...entryLevelResume, summary: "Reduced callbacks by 35 percent across service visits." };\n  const { response, payload } = await run(h, dependenciesFor(inflated));\n  assert.equal(response.status, 200);\n  assert.equal(payload.ok, true);\n  assert.equal(h.state.creditsUsed, 1);\n  assert.ok(h.state.generatedJson);\n  assert.doesNotMatch(h.state.generatedJson ?? "", /35/);\n  const generation = h.batched.find((item) => /INSERT INTO resume_generations/i.test(item.sql));\n  assert.ok(generation);\n  assert.equal(String(generation.values[7]), "[]");\n});'''
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('tests/resume-upload-enhancement-regression.test.ts')
s = p.read_text()
s = s.replace(
    'test("Gemini uploaded-resume enhancement automatically retries an invented metric instead of asking the customer for numbers", async () => {',
    'test("Gemini uploaded-resume enhancement repairs an invented metric without forcing a second model call", async () => {',
    1,
)
s = s.replace('  assert.equal(calls, 2);', '  assert.equal(calls, 1);', 1)
s = s.replace(
'''  assert.match(systemPrompts[1], /Safety retry rule/i);\n  assert.match(systemPrompts[1], /Do not create estimates, percentages, counts, quantities/i);''',
'''  assert.equal(systemPrompts.length, 1);\n  assert.doesNotMatch(JSON.stringify(h.state.generatedJson), /35 percent/i);''',
1,
)
p.write_text(s)
