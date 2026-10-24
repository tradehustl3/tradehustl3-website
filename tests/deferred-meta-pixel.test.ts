import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { META_PIXEL_QUEUE_READY, startDeferredMetaPixel } from "../app/deferred-meta-pixel";
import { trackMetaViewContent } from "../app/meta-pixel";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

afterEach(() => {
  for (const [key, original] of [["window", originalWindow], ["document", originalDocument]] as const) {
    if (original) Object.defineProperty(globalThis, key, original);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function browser({ complete = false, idle = true } = {}) {
  const events = new EventTarget();
  const pending = new Map<number, () => void>();
  const scripts: { id: string; src: string; async: boolean }[] = [];
  let nextId = 0;
  const schedule = (fn: () => void) => { pending.set(++nextId, fn); return nextId; };
  const cancel = (id: number) => { pending.delete(id); };
  const fakeWindow = {
    location: { pathname: "/book/sample" },
    localStorage: { getItem: () => null },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    requestIdleCallback: idle ? schedule : undefined,
    cancelIdleCallback: cancel,
    setTimeout: schedule,
    clearTimeout: cancel,
    fbq: undefined as undefined | (((...args: unknown[]) => void) & { queue: unknown[][] }),
  };
  const fakeDocument = {
    readyState: complete ? "complete" : "loading",
    createElement: () => ({ id: "", src: "", async: false }),
    getElementById: (id: string) => scripts.find((script) => script.id === id),
    head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, "document", { configurable: true, value: fakeDocument });
  return {
    window: fakeWindow,
    scripts,
    pending,
    load() { fakeDocument.readyState = "complete"; events.dispatchEvent(new Event("load")); },
    idle() {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((fn) => fn());
    },
  };
}

test("Meta queues early campaign and lead events but fetches only after load and idle", () => {
  const page = browser();
  page.window.addEventListener(META_PIXEL_QUEUE_READY, () => trackMetaViewContent("book_sample"));
  startDeferredMetaPixel(() => true);
  page.window.fbq?.("track", "Lead", { content_name: "book_sample" });
  assert.deepEqual(page.window.fbq?.queue, [
    ["init", "2260020274539615"],
    ["track", "PageView"],
    ["track", "ViewContent", { content_name: "book_sample" }],
    ["track", "Lead", { content_name: "book_sample" }],
  ]);
  assert.equal(page.pending.size, 0);
  assert.equal(page.scripts.length, 0);
  page.load();
  assert.equal(page.scripts.length, 0);
  page.idle();
  assert.equal(page.scripts.length, 1);
  assert.equal(page.scripts[0].src, "https://connect.facebook.net/en_US/fbevents.js");
  assert.equal(page.scripts[0].async, true);
});

test("unmount cancels a waiting load listener or idle callback", () => {
  const page = browser();
  const cancelLoad = startDeferredMetaPixel(() => true);
  cancelLoad();
  page.load();
  assert.equal(page.pending.size, 0);
  const cancelIdle = startDeferredMetaPixel(() => true);
  assert.equal(page.pending.size, 1);
  cancelIdle();
  page.idle();
  assert.equal(page.scripts.length, 0);
});

test("consent and route permission are checked again at fetch time", () => {
  const page = browser({ complete: true });
  let allowed = true;
  startDeferredMetaPixel(() => allowed);
  allowed = false;
  page.idle();
  assert.equal(page.scripts.length, 0);
  allowed = true;
  startDeferredMetaPixel(() => allowed);
  page.idle();
  assert.equal(page.scripts.length, 1);
  assert.deepEqual(page.window.fbq?.queue, [["init", "2260020274539615"], ["track", "PageView"]]);
});

test("blocked tracking never creates a queue or schedules a library request", () => {
  const page = browser({ complete: true });
  startDeferredMetaPixel(() => false);
  assert.equal(page.window.fbq, undefined);
  assert.equal(page.pending.size, 0);
  assert.equal(page.scripts.length, 0);
});

test("the timer fallback works after load and remounts do not duplicate the library", () => {
  const page = browser({ idle: false });
  startDeferredMetaPixel(() => true);
  assert.equal(page.pending.size, 0);
  page.load();
  page.idle();
  startDeferredMetaPixel(() => true);
  page.idle();
  assert.equal(page.scripts.length, 1);
  assert.deepEqual(page.window.fbq?.queue, [["init", "2260020274539615"], ["track", "PageView"]]);
});
