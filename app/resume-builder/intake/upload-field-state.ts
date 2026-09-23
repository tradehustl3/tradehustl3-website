import type { WizardData } from "./wizard-data";
import { uploadValues } from "../../../worker/resume-upload-requirements";

export { fieldStates, uploadValues, type ConfirmedValue, type UploadFieldState } from "../../../worker/resume-upload-requirements";

/** Called only for explicit edits/confirmations, never during extraction/hydration. */
export function recordUserCorrections(previous: WizardData, next: WizardData, confirmedPaths: string[] = []): WizardData {
  if (next.sourceProvenance !== "upload") return next;
  const before = uploadValues(previous);
  const after = uploadValues(next);
  const confirmedFields = { ...previous.confirmedFields };
  const roleOrigins = { ...previous.roleOrigins };
  for (const [path, value] of Object.entries(after)) {
    if (JSON.stringify(before[path]) !== JSON.stringify(value) || confirmedPaths.includes(path)) {
      confirmedFields[path] = value;
      const roleIndex = path.match(/^roles\.(\d+)\./)?.[1];
      if (roleIndex !== undefined && !roleOrigins[roleIndex] && previous.roles[Number(roleIndex)]) {
        roleOrigins[roleIndex] = { ...previous.roles[Number(roleIndex)] };
      }
    }
  }
  return { ...next, confirmedFields, roleOrigins };
}

/** Re-apply explicit corrections on top of a fresh extraction (re-upload or recovery). */
export function preserveUserCorrections(previous: WizardData, extracted: WizardData): WizardData {
  const result = structuredClone(extracted);
  result.confirmedFields = {};
  result.roleOrigins = {};
  const indexMap = new Map<string, number>();
  const previousValues = uploadValues(previous);
  for (const [path, value] of Object.entries(previous.confirmedFields ?? {})) {
    // A stale confirmation (the value changed afterwards) is not a correction.
    if (!Object.hasOwn(previousValues, path) || JSON.stringify(value) !== JSON.stringify(previousValues[path])) continue;
    const roleMatch = path.match(/^roles\.(\d+)\.(\w+)$/);
    let target = path;
    if (roleMatch) {
      const [, oldIndex, field] = roleMatch;
      let index = indexMap.get(oldIndex);
      if (index === undefined) {
        const oldRole = previous.roles[Number(oldIndex)];
        if (!oldRole) continue;
        const origin = previous.roleOrigins?.[oldIndex] ?? oldRole;
        index = result.roles.findIndex((role) => [origin, oldRole].some((identity) => role.employer === identity.employer && role.jobTitle === identity.jobTitle && role.startDate === identity.startDate));
        if (index < 0) { index = result.roles.length; result.roles.push({ ...oldRole }); }
        indexMap.set(oldIndex, index);
        result.roleOrigins[String(index)] = origin;
      }
      target = `roles.${index}.${field}`;
    }
    const parts = target.split(".");
    let object: Record<string, unknown> | undefined = result as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) object = object?.[part] as Record<string, unknown> | undefined;
    if (!object) continue;
    object[parts[parts.length - 1]] = value;
    result.confirmedFields[target] = value;
  }
  return result;
}
