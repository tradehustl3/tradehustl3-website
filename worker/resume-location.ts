// Match literal source text, without guessing a candidate's home from a job location.
const STATE_NAMES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"];
export const STATE_CODES = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
// Case-sensitive on purpose: state codes must be uppercase so ordinary words such
// as "in", "or", "me", "oh", and "ok" are never read as states. Full names may be
// Title Case or ALL CAPS.
const STATE = `(?:${STATE_NAMES.flatMap((name) => [name, name.toUpperCase()]).join("|")}|${STATE_CODES})`;
const CITY = "[A-Z][A-Za-z.'-]*(?:\\s+[A-Z][A-Za-z.'-]*){0,2}";
const ZIP = "(?:\\s+\\d{5}(?:-\\d{4})?)?";
// City + state at the start of a field, or after a street address and a comma.
const CITY_STATE = new RegExp(`(?:^|,\\s*)(${CITY}(?:,\\s*|\\s+)${STATE})${ZIP}\\s*$`);
const STATE_ONLY = new RegExp(`^(${STATE})${ZIP}$`);
const LABEL = /^(?:location|address|based in|city(?:\s*(?:\/|and|&)\s*state)?)\s*:\s*/i;
const CONTACT_SIGNAL = /@|(?:\d{3}[\s().-]*){2}\d{4}/;

export function locationInLine(line: string): string {
  for (const part of line.split(/\s*[|•▪◦●·]\s*/)) {
    const cleaned = part.replace(LABEL, "").trim();
    const match = cleaned.match(CITY_STATE);
    if (match) return match[1];
  }
  return "";
}

/** A labelled city-only value or a bare state is a partial location, never a question. */
function partialLocationInLine(line: string, labelled: boolean): string {
  for (const part of line.split(/\s*[|•▪◦●·]\s*/)) {
    const cleaned = part.replace(LABEL, "").trim();
    const state = cleaned.match(STATE_ONLY);
    if (state) return state[1];
    if (labelled && LABEL.test(part.trim()) && /^[A-Z][A-Za-z .'-]{1,60}$/.test(cleaned)) return cleaned;
  }
  return "";
}

export function extractContactLocation(source: string): string {
  const lines = source.split(/\r?\n/);
  let contactSection = true;
  let partial = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^(?:contact(?: information| details)?|personal details)\s*:?$/i.test(line)) contactSection = true;
    else if (/^(?:.*experience|work history|employment history|education|.*skills|.*summary|certifications?.*|licenses?)\s*:?$/i.test(line)) contactSection = false;
    // A contact-labelled line is reliable anywhere; do not borrow employer locations.
    const labelled = LABEL.test(line);
    const nearContact = lines.slice(Math.max(0, index - 2), index + 3).some((neighbor) => CONTACT_SIGNAL.test(neighbor));
    if (contactSection || labelled || nearContact) {
      const location = locationInLine(line);
      if (location) return location;
      partial ||= partialLocationInLine(line, labelled);
    }
  }
  return partial;
}
