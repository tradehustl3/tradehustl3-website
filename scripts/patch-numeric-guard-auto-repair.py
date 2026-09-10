from pathlib import Path

base = Path('worker/resume-builder-base.ts')
text = base.read_text()
old = '''  if (initialGuardFlags.length || guardFlags.length) {\n    const allGuardFlags = [...initialGuardFlags, ...guardFlags];\n    const sections = Array.from(new Set(allGuardFlags.map((flag) => flag.section)));\n    throw new ResumeGenerationError(\n      "UNSUPPORTED_NUMERIC_CLAIM",\n      "The generated resume contained numeric claims the intake does not support.",\n      [INTAKE_SECTION.numbers],\n      { code: "unsupported_numeric_claim", count: allGuardFlags.length, sections },\n    );\n  }'''
new = '''  // Only reject numeric claims that still exist after deterministic source-grounded repair.\n  // The first draft may contain an unsupported number, but if repair removes it using the\n  // authoritative intake/sourceResumeText evidence, the customer should receive the repaired\n  // resume instead of being forced through another generation attempt.\n  if (guardFlags.length) {\n    const sections = Array.from(new Set(guardFlags.map((flag) => flag.section)));\n    throw new ResumeGenerationError(\n      "UNSUPPORTED_NUMERIC_CLAIM",\n      "The generated resume still contains numeric claims unsupported by the verified sources after automatic repair.",\n      [INTAKE_SECTION.numbers],\n      {\n        code: "unsupported_numeric_claim",\n        count: guardFlags.length,\n        sections,\n        repairedInitialCount: initialGuardFlags.length,\n      },\n    );\n  }'''
assert old in text
text = text.replace(old, new, 1)
base.write_text(text)

wrapper = Path('worker/resume-builder.ts')
w = wrapper.read_text()
old_msg = 'message: "HUSTL3 BOT caught unsupported numeric wording and did not consume a customer AI run. Try the build again; do not add or invent metrics just to continue.",'
new_msg = 'message: "HUSTL3 BOT automatically retried the build, but unsupported numeric wording still remained. No customer AI run was consumed. Only review numeric facts that are actually present in your uploaded resume or intake before rebuilding.",'
assert old_msg in w
w = w.replace(old_msg, new_msg, 1)
wrapper.write_text(w)
