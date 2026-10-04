// Pure, DOM-free logic behind the in-workspace protected PDF preview. Kept apart
// from the React component so it can be unit tested in Node.

export type PreviewRenderer = "frame" | "canvas";

// Phone-sized viewports (the mobile breakpoint the review page has always used).
export const NARROW_PREVIEW_QUERY = "(max-width: 820px)";
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

// Resumes and cover letters are short; a cap keeps a malformed or oversized file
// from rendering dozens of canvases on a phone.
export const MAX_PREVIEW_PAGES = 6;

// iOS Safari refuses canvases above ~16.7M pixels and caps total canvas memory, so
// each page stays well under that even on a large high-density tablet.
export const MAX_CANVAS_PIXELS = 4_000_000;
const MAX_DEVICE_PIXEL_RATIO = 2;

export type PreviewEnvironment = {
  /** `navigator.pdfViewerEnabled`; undefined when the browser does not report it. */
  pdfViewerEnabled: boolean | undefined;
  narrowViewport: boolean;
  coarsePointer: boolean;
};

/** Always use the controlled viewer, including desktops with native PDF support. */
export function choosePreviewRenderer(_env: PreviewEnvironment): PreviewRenderer {
  void _env;
  return "canvas";
}

export type ProtectedPdfErrorCode = "unauthorized" | "unavailable" | "not_pdf";

export class ProtectedPdfError extends Error {
  readonly code: ProtectedPdfErrorCode;

  constructor(code: ProtectedPdfErrorCode) {
    super(code);
    this.name = "ProtectedPdfError";
    this.code = code;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Loads the customer's own protected PDF (watermarked preview, or clean file once
 * paid) from the same authenticated, owner-checked route the iframe uses. The
 * session cookie authenticates it; the server decides what the bytes contain.
 */
export async function fetchProtectedPdf(src: string, fetchImpl: FetchLike = fetch, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetchImpl(src, { credentials: "same-origin", cache: "no-store", signal });
  if (response.status === 401) throw new ProtectedPdfError("unauthorized");
  if (!response.ok) throw new ProtectedPdfError("unavailable");
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!/^application\/pdf\b/i.test(contentType)) throw new ProtectedPdfError("not_pdf");
  const bytes = new Uint8Array(await response.arrayBuffer());
  // "%PDF-"
  if (bytes.length < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) {
    throw new ProtectedPdfError("not_pdf");
  }
  return bytes;
}

/**
 * Scale for drawing one page into a container of `containerWidth` CSS pixels:
 * sharp on high-density screens, but never above the canvas pixel budget.
 */
export function pageRenderScale(pageWidth: number, pageHeight: number, containerWidth: number, devicePixelRatio: number): number {
  if (!(pageWidth > 0) || !(pageHeight > 0) || !(containerWidth > 0)) return 0;
  const cssScale = containerWidth / pageWidth;
  const density = Math.min(Math.max(devicePixelRatio || 1, 1), MAX_DEVICE_PIXEL_RATIO);
  const budget = Math.sqrt(MAX_CANVAS_PIXELS / (pageWidth * pageHeight));
  return Math.min(cssScale * density, budget);
}
