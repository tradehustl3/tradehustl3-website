from pathlib import Path

base = Path('worker/resume-builder-base.ts')
text = base.read_text()
text = text.replace(
    '- Every number in the resume must appear in the intake or customer correction.',
    '- Every number in the resume must appear in the structured intake, sourceResumeText, or customer correction.',
    1,
)
text = text.replace(
    'Use empty arrays for unsupported optional sections. Every experience bullet must be supported by the intake.',
    'Use empty arrays for unsupported optional sections. Every experience bullet must be supported by the structured intake or sourceResumeText.',
    1,
)
assert 'Every number in the resume must appear in the structured intake, sourceResumeText, or customer correction.' in text
assert 'Every experience bullet must be supported by the structured intake or sourceResumeText.' in text
base.write_text(text)

wrapper = Path('worker/resume-builder.ts')
w = wrapper.read_text()
w = w.replace(
    'A previous draft was rejected because it introduced unsupported numeric wording. Use only numeric facts already supported by the intake.',
    'A previous draft was rejected because it introduced unsupported numeric wording. Use only numeric facts already supported by the structured intake, original uploaded resume text, or customer correction.',
    1,
)
assert 'structured intake, original uploaded resume text, or customer correction' in w
wrapper.write_text(w)
