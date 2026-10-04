import type { GeneratedResume } from './resume-documents';
/** Scope is copied verbatim from a uniquely matched customer role. An AI-added
 * scope property is ignored. No title-based leadership or numeric inference.
 * The existing wizard's explicit Leadership field may contain crew/account scope.
 */
export function withCustomerScope(resume: GeneratedResume, intakeJson: string | null | undefined): GeneratedResume {
  let roles: Array<Record<string, unknown>> = [];
  try {
    const intake = JSON.parse(intakeJson ?? '{}') as { experience?: unknown };
    if (Array.isArray(intake.experience)) roles = intake.experience.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value)));
  } catch { /* No source scope means no scope line. */ }
  const normalize = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().toLowerCase() : '';
  return { ...resume, experience: resume.experience.map(job => {
    const matches = roles.filter(role => normalize(role.jobTitle) === normalize(job.jobTitle) && normalize(role.employer) === normalize(job.employer));
    const source = matches.length === 1 ? matches[0] : null;
    const explicit = source && typeof source.scope === 'string' ? source.scope.trim() : '';
    const leadership = source && typeof source.leadership === 'string' ? source.leadership.trim() : '';
    const scope = explicit || (/\b(?:crew|team|accounts?|scope|supervis|lead|manage|oversee|direct|schedule)/i.test(leadership) ? leadership : '');
    return { ...job, scope: scope ? scope.slice(0, 500) : undefined };
  }) };
}
