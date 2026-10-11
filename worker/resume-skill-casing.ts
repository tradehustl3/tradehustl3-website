/**
 * Presentation-only casing for the skills list.
 *
 * Customers often type or paste a few skills in all caps ("FACILITIES
 * OPERATIONS") next to title-case ones, which reads as a formatting error on a
 * paid document. Only skills written entirely in capitals are re-cased; any skill
 * with lowercase letters is the customer's deliberate casing and is left alone.
 * Trade acronyms and codes stay uppercase. The stored resume is never modified,
 * so the same rule applies to PDF and DOCX, preview and paid files alike.
 */

// Trade, safety and building-systems acronyms that must stay uppercase.
const ACRONYMS = new Set([
  "ABS", "AC", "ADA", "AED", "AFCI", "AHU", "AHUS", "ANSI", "API", "ASHRAE", "ASME", "AWS", "BAS", "BIM", "BMS",
  "BTU", "CAD", "CDL", "CFC", "CMMS", "CNC", "CPR", "CPVC", "CSST", "DC", "DDC", "DOT", "EMT", "EPA", "ERV", "GFCI",
  "GMAW", "GPS", "GTAW", "HCFC", "HRV", "HVAC", "HVACR", "IAQ", "IT", "LED", "LEED", "LOTO", "MAU", "MEP", "MIG",
  "MSDS", "NATE", "NEC", "NFPA", "OEM", "OSHA", "PEX", "PLC", "PLCS", "PM", "PMS", "PPE", "PTAC", "PVC", "QA",
  "QC", "RTU", "RTUS", "SDS", "SMAW", "FCAW", "TIG", "UPS", "VAV", "VAVS", "VFD", "VFDS", "VRF", "WMS",
  "CFM", "CMU", "EPDM", "GPM", "IBC", "ICC", "IMC", "IPC", "NCCER", "PSI", "RPZ", "SCBA", "TPO", "UPC",
]);

const MINOR_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "via", "with"]);

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isShouting(skill: string): boolean {
  if (!/[A-Z]/.test(skill) || /[a-z]/.test(skill)) return false;
  // Re-case only when at least one real word (not an acronym or code) is shouted.
  return (skill.match(/[A-Z]+/g) ?? []).some((word) => word.length >= 4 && !ACRONYMS.has(word));
}

function caseWord(word: string, first: boolean): string {
  const letters = word.replace(/[^A-Z]/g, "");
  if (!letters || /\d/.test(word) || ACRONYMS.has(letters)) return word;
  const lower = word.toLowerCase();
  if (!first && MINOR_WORDS.has(lower)) return lower;
  return lower.replace(/[a-z]/, (char) => char.toUpperCase());
}

/** One skill, re-cased only when it was typed entirely in capitals. */
export function presentableSkill(skill: string): string {
  const value = clean(skill);
  if (!isShouting(value)) return value;
  let first = true;
  // Keep separators ("/", "-", "&", parentheses) and re-case each word between them.
  return value.replace(/[A-Z0-9']+/g, (word) => {
    const next = caseWord(word, first);
    first = false;
    return next;
  });
}

/** The rendered skills list: cleaned, re-cased and de-duplicated case-insensitively. */
export function presentableSkills(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const value = presentableSkill(skill);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}
