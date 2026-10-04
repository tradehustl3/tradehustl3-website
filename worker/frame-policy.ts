// The Resume Builder review page shows the customer's own resume and cover-letter
// PDFs in an iframe. Only those owner-authenticated file routes may be framed, and
// only by this site; every other response keeps frame-ancestors 'none' and DENY.
const SAME_ORIGIN_FRAMEABLE_PATH = /^\/api\/resume-builder\/resumes\/[^/]+\/(?:files\/(?:preview|pdf)|cover-letter\/files\/pdf)$/;

export function allowsSameOriginFraming(pathname: string): boolean {
  return SAME_ORIGIN_FRAMEABLE_PATH.test(pathname);
}

export function frameHeaders(frameable: boolean): { xFrameOptions: "SAMEORIGIN" | "DENY" } {
  return { xFrameOptions: frameable ? "SAMEORIGIN" : "DENY" };
}

export function withFrameAncestors(policy: string, frameable: boolean): string {
  return frameable ? policy.replace("frame-ancestors 'none'", "frame-ancestors 'self'") : policy;
}
