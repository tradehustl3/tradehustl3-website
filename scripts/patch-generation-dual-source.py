from pathlib import Path

base = Path('worker/resume-builder-base.ts')
text = base.read_text()

text = text.replace(
    "- Candidate facts may come only from the customer's intake.\n",
    "- Candidate facts may come from two authoritative customer sources: the structured intake and the original uploaded resume text stored in sourceResumeText. Treat both as first-party evidence.\n- For uploaded resumes, re-read sourceResumeText as independent backup evidence. If the structured extraction missed a supported job, education item, credential, duty, tool, software/CMMS item, or training fact that is clearly present in sourceResumeText, preserve the raw-source fact instead of dropping it.\n",
    1,
)
text = text.replace(
    "- Preserve every supported employer, title, location, date range, credential, education item, and substantive work-history duty. Do not collapse a multi-job source resume into a summary and skills page.\n",
    "- Preserve every supported employer, title, location, date range, credential, education item, substantive work-history duty, tool/equipment fact, software/CMMS item, and meaningful training item across BOTH the structured intake and sourceResumeText. Do not collapse a multi-job source resume into a summary and skills page.\n- sourceResumeText is a backup evidence layer, not disposable context. When structured and raw sources differ because extraction omitted a supported fact, use the original uploaded resume text as the recovery source. Never use it to invent facts that are not actually present.\n",
    1,
)
text = text.replace(
    "Never invent an ID and never cite a fact that does not support the claim.`;",
    "Never invent an ID and never cite a fact that does not support the claim. When a claim is preserved from the original upload because structured extraction did not capture it, cite the matching upload.raw.* fact ID.`;",
    1,
)
for fragment in ["two authoritative customer sources", "backup evidence layer", "upload.raw.* fact ID"]:
    assert fragment in text, fragment
base.write_text(text)

quality = Path('worker/resume-quality.ts')
q = quality.read_text()
q = q.replace(
'''      ...source.software,\n      ...source.safety,\n    ];\n    if (match.bullets.some((bullet) => !claimSupported(bullet, supportClaims))) {''',
'''      ...source.software,\n      ...source.safety,\n      source.sourceResumeText,\n    ].filter(Boolean);\n    if (match.bullets.some((bullet) => !claimSupported(bullet, supportClaims))) {''',
1,
)
q = q.replace(
'''  const additionalSources = [...source.safety, ...source.certifications, ...source.licenses, source.education].filter(Boolean);''',
'''  const additionalSources = [...source.safety, ...source.certifications, ...source.licenses, source.education, source.sourceResumeText].filter(Boolean);''',
1,
)
q = q.replace(
'''      ...source.software,\n      ...source.safety,\n    ];\n    const supportedGeneratedBullets = existing?.bullets.filter((bullet) => {''',
'''      ...source.software,\n      ...source.safety,\n      source.sourceResumeText,\n    ].filter(Boolean);\n    const supportedGeneratedBullets = existing?.bullets.filter((bullet) => {''',
1,
)
q = q.replace(
'''      ...source.licenses,\n      source.education,\n    ].filter(Boolean))),''',
'''      ...source.licenses,\n      source.education,\n      source.sourceResumeText,\n    ].filter(Boolean))),''',
1,
)
assert q.count('source.sourceResumeText') >= 10
quality.write_text(q)

wrapper = Path('worker/resume-builder.ts')
w = wrapper.read_text()
start = w.index('const GENERATION_PRESERVATION_INSTRUCTION = `Uploaded-resume enhancement rule:')
end = w.index('`;', start) + 2
new_block = '''const GENERATION_PRESERVATION_INSTRUCTION = `Uploaded-resume enhancement rule:\nEnhancement means preserve first, then improve wording. Use BOTH authoritative customer sources: the structured intake and the original uploaded resume text in sourceResumeText. Keep every supported contact detail, employer, job title, location, date, certification/license, education item, substantive duty/accomplishment, tool/equipment/system, software/CMMS item, and meaningful training fact found in either source. The original uploaded resume is the backup evidence layer whenever structured extraction omitted a supported fact. Reword and reorganize for clarity, trade relevance, and ATS readability, but do not reduce factual coverage. For raw-source-only facts, ground the rewritten claim to the matching upload.raw.* fact. Never add a number, percentage, count, date, years-of-experience claim, unit count, team size, equipment size, or quantity unless that numeric fact is explicitly supported by the structured intake or original uploaded resume. If metrics are absent, write strong nonnumeric bullets instead of inventing metrics.`;'''
w = w[:start] + new_block + w[end:]
assert "Use BOTH authoritative customer sources" in w
wrapper.write_text(w)
