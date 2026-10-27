/** Cache real public images, never an HTML error or redirect at an image URL. */
export function withPublicAssetCache(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname;
  const optimized = path.startsWith("/optimized/");
  const icon = /^\/(?:favicon(?:-\d+x\d+)?\.(?:ico|png|svg)|apple-touch-icon\.png)$/.test(path);
  if (!optimized && !icon) return response;
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  const headers = new Headers(response.headers);
  if (response.status !== 200 || !headers.get("Content-Type")?.startsWith("image/")) {
    headers.set("Cache-Control", "no-store");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  } else {
    // Optimized files get a new filename when changed. Stable favicon URLs
    // must revalidate so a rebrand doesn't leave a year-old logo in browsers.
    headers.set("Cache-Control", optimized
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600, must-revalidate");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
