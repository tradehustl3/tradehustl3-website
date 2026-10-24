const PIXEL_ID = "2260020274539615";
const SCRIPT_ID = "meta-pixel-library";
export const META_PIXEL_QUEUE_READY = "tradehustl3-meta-pixel-queue-ready";

interface PixelQueue {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: PixelQueue;
  loaded: boolean;
  version: string;
}

type PixelWindow = Window & { fbq?: PixelQueue; _fbq?: PixelQueue };

/** Queue early events, but fetch Meta's library only after load and idle time. */
export function startDeferredMetaPixel(isAllowed: () => boolean): () => void {
  if (!isAllowed()) return () => {};

  const pixelWindow = window as PixelWindow;
  if (!pixelWindow.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as PixelQueue;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    pixelWindow.fbq = fbq;
    pixelWindow._fbq ??= fbq;
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
  }
  pixelWindow.dispatchEvent(new Event(META_PIXEL_QUEUE_READY));

  let cancelled = false;
  let idleId: number | undefined;
  let timerId: number | undefined;

  const load = () => {
    // Consent or the route may change while waiting for load/idle.
    if (cancelled || !isAllowed() || document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  };

  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(load);
    else timerId = window.setTimeout(load, 1);
  };

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
    if (timerId !== undefined) window.clearTimeout(timerId);
  };
}
