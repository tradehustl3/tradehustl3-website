// One lazily loaded pdf.js instance for the Resume Builder (upload text extraction
// and the in-workspace preview renderer). The legacy build supports older mobile
// Safari; the worker is served from this site, which the CSP allows.
export async function loadPdfjs() {
  const [{ default: workerUrl }, pdfjs] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);
  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerUrl) pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}
