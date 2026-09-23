/**
 * Provider and renderer errors can echo request content (resume text, contact
 * details, model output). Log only the error class, never its message or body.
 */
export function errorKind(error: unknown): string {
  return error instanceof Error ? error.name || "Error" : typeof error;
}
