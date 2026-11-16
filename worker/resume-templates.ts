/** Versioned presentation settings; independent of factual generation and entitlements. */
export const FONTS = ['Classic', 'Modern', 'Traditional'] as const;
export const TEXT_SIZES = ['Small', 'Standard', 'Large'] as const;
export const SPACINGS = ['Compact', 'Standard', 'Spacious'] as const;
export const ACCENTS = ['Red', 'Navy', 'Charcoal', 'Forest Green', 'Burgundy', 'Black'] as const;
export type ResumeStyle = {
  font: typeof FONTS[number]; textSize: typeof TEXT_SIZES[number];
  spacing: typeof SPACINGS[number]; accent: typeof ACCENTS[number]; templateVersion: 1 | 2;
};
/**
 * Career tracks steer AI wording and content emphasis. The persisted values are
 * also the original three visual templates, so they remain valid template keys.
 */
export const CAREER_TRACKS = ['plain', 'navy', 'lead'] as const;
export type CareerTrack = typeof CAREER_TRACKS[number];
/**
 * Visual templates control presentation only. `premier` and `blueprint` are
 * design-only: choosing one never changes the career track or the wording.
 */
export const TEMPLATE_KEYS = ['plain', 'navy', 'lead', 'premier', 'blueprint'] as const;
export type TemplateKey = typeof TEMPLATE_KEYS[number];
export function isCareerTrack(value: unknown): value is CareerTrack {
  return typeof value === 'string' && (CAREER_TRACKS as readonly string[]).includes(value);
}
export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === 'string' && (TEMPLATE_KEYS as readonly string[]).includes(value);
}
/** Unknown or missing values fall back to Field Pro, as before. */
export function normalizeTemplate(value: unknown): TemplateKey {
  return isTemplateKey(value) ? value : 'plain';
}
export function normalizeTrack(value: unknown): CareerTrack {
  return isCareerTrack(value) ? value : 'plain';
}
/**
 * The career track to write with. A track-bearing template carries its own track;
 * a design-only template keeps the stored track (Field Pro when none is stored).
 */
export function trackForTemplate(template: unknown, storedTrack: unknown): CareerTrack {
  return isCareerTrack(template) ? template : normalizeTrack(storedTrack);
}
export const ACCENT_HEX = { Red: 'D71920', Navy: '203D60', Charcoal: '444444', 'Forest Green': '24543C', Burgundy: '7A243A', Black: '111111' } as const;
export const FONT_FAMILIES = { Classic: { pdf: 'Arimo', docx: 'Arial' }, Modern: { pdf: 'Carlito', docx: 'Calibri' }, Traditional: { pdf: 'Gelasio', docx: 'Georgia' } } as const;
export const BODY_SIZES = { Small: 10, Standard: 10.5, Large: 11 } as const;
export const SPACE_FACTORS = { Compact: 0.85, Standard: 1, Spacious: 1.18 } as const;
export const RESUME_TEMPLATES = {
  plain: { name: 'Field Pro', header: 'centered', headings: 'ruled', skills: 'grid', skillsColumns: 3, sections: ['summary', 'skills', 'certifications', 'experience', 'education', 'additional'], defaults: { font: 'Classic', accent: 'Navy' } },
  navy: { name: 'Modern Trade', header: 'top-bar', headings: 'short-underline', skills: 'grid', skillsColumns: 2, sections: ['summary', 'certifications', 'skills', 'experience', 'education', 'additional'], defaults: { font: 'Modern', accent: 'Red' } },
  lead: { name: 'Lead / Supervisor', header: 'tinted-band', headings: 'accent-rule', skills: 'grid', skillsColumns: 3, sections: ['summary', 'certifications', 'skills', 'experience', 'education', 'additional'], defaults: { font: 'Traditional', accent: 'Navy' } },
  // Design-only looks. Experience-first with an inline skills line, and a
  // credential-forward layout with a solid header panel and banded headings.
  premier: { name: 'Premier', header: 'double-rule', headings: 'leader-rule', skills: 'inline', skillsColumns: 1, sections: ['summary', 'experience', 'skills', 'certifications', 'education', 'additional'], defaults: { font: 'Traditional', accent: 'Charcoal' } },
  blueprint: { name: 'Blueprint', header: 'solid-panel', headings: 'banded', skills: 'grid', skillsColumns: 2, sections: ['summary', 'certifications', 'skills', 'experience', 'education', 'additional'], defaults: { font: 'Modern', accent: 'Navy' } },
} as const;
export function defaultStyle(theme: TemplateKey, templateVersion: 1 | 2 = 2): ResumeStyle {
  return { ...RESUME_TEMPLATES[theme].defaults, textSize: 'Standard', spacing: 'Standard', templateVersion };
}
export function storedStyle(row: { font?: unknown; text_size?: unknown; spacing?: unknown; accent?: unknown; template_version?: unknown }, theme: TemplateKey): ResumeStyle {
  // Design-only templates exist only in the v2 renderer.
  const defaults = defaultStyle(theme, row.template_version === 2 || !isCareerTrack(theme) ? 2 : 1);
  return { font: FONTS.includes(row.font as ResumeStyle['font']) ? row.font as ResumeStyle['font'] : defaults.font,
    textSize: TEXT_SIZES.includes(row.text_size as ResumeStyle['textSize']) ? row.text_size as ResumeStyle['textSize'] : defaults.textSize,
    spacing: SPACINGS.includes(row.spacing as ResumeStyle['spacing']) ? row.spacing as ResumeStyle['spacing'] : defaults.spacing,
    accent: ACCENTS.includes(row.accent as ResumeStyle['accent']) ? row.accent as ResumeStyle['accent'] : defaults.accent, templateVersion: defaults.templateVersion };
}
export function validStylePatch(body: Record<string, unknown>): boolean {
  return Object.keys(body).length > 0 && Object.entries(body).every(([key, value]) => {
    const allowed: Record<string, readonly unknown[]> = { theme: TEMPLATE_KEYS, font: FONTS, textSize: TEXT_SIZES, spacing: SPACINGS, accent: ACCENTS };
    return Object.hasOwn(allowed, key) && allowed[key].includes(value);
  });
}
export const TRACK_HEADINGS = {
  plain: { summary: 'PROFESSIONAL SUMMARY', skills: 'CORE SKILLS', additional: 'ADDITIONAL INFORMATION' },
  navy: { summary: 'PROFESSIONAL PROFILE', skills: 'AREAS OF EXPERTISE', additional: 'TECHNICAL TOOLS, SYSTEMS & TRAINING' },
  lead: { summary: 'LEADERSHIP PROFILE', skills: 'TECHNICAL & OPERATIONS COMPETENCIES', additional: 'TECHNICAL EXPERTISE & ADDITIONAL QUALIFICATIONS' },
} as const;
/** Group only source skills. Unknown skills trigger a plain grid; never invent categories or skills. */
export function skillGroups(skills: string[]): { labels: string[]; columns: string[][] } | null {
  const systems: string[] = [], methods: string[] = [];
  for (const skill of skills) {
    if (/work order/i.test(skill)) { methods.push(skill); continue; }
    if (/rtu|rooftop|chiller|boiler|heat pump|split system|furnace|duct|bas|controls|equipment|systems/i.test(skill)) systems.push(skill);
    else if (/repair|troubleshoot|meter|gauge|refrigerant|braz|solder|maintenance|work order|diagnos|safety|training|communication/i.test(skill)) methods.push(skill);
    else return null;
  }
  return systems.length && methods.length ? { labels: ['Systems & equipment', 'Tools & methods'], columns: [systems, methods] } : null;
}
