"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadPdfjs } from "../pdfjs";
import {
  COARSE_POINTER_QUERY,
  MAX_PREVIEW_PAGES,
  NARROW_PREVIEW_QUERY,
  ProtectedPdfError,
  choosePreviewRenderer,
  fetchProtectedPdf,
  pageRenderScale,
  type PreviewRenderer,
} from "./protected-pdf";

type Pdfjs = Awaited<ReturnType<typeof loadPdfjs>>;
type PdfDocument = Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>;
type LoadState =
  | { status: "loading" }
  | { status: "ready"; pdf: PdfDocument; pageCount: number }
  | { status: "error" };

function watch(query: MediaQueryList, onChange: () => void): () => void {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

function subscribe(onChange: () => void): () => void {
  const stops = [NARROW_PREVIEW_QUERY, COARSE_POINTER_QUERY].map((query) => watch(window.matchMedia(query), onChange));
  return () => stops.forEach((stop) => stop());
}

function clientRenderer(): PreviewRenderer {
  return choosePreviewRenderer({
    pdfViewerEnabled: navigator.pdfViewerEnabled,
    narrowViewport: window.matchMedia(NARROW_PREVIEW_QUERY).matches,
    coarsePointer: window.matchMedia(COARSE_POINTER_QUERY).matches,
  });
}

// Canvas works everywhere, so it is the safe answer when there is no browser yet.
const serverRenderer = (): PreviewRenderer => "canvas";

/**
 * Shows the customer's protected PDF inside the review workspace. Desktop browsers
 * with a built-in PDF viewer keep the iframe; phones, tablets, and browsers without
 * one get the same authenticated, server-watermarked file drawn with pdf.js. Either
 * way the customer never leaves the workspace and the server decides what is shown.
 */
export function ProtectedPdfPreview({ src, title }: { src: string; title: string }) {
  const renderer = useSyncExternalStore(subscribe, clientRenderer, serverRenderer);
  const [attempt, setAttempt] = useState(0);
  if (renderer === "frame") return <iframe src={src} title={title} />;
  return <CanvasPdfPreview key={`${src}#${attempt}`} src={src} title={title} onRetry={() => setAttempt((value) => value + 1)} />;
}

function CanvasPdfPreview({ src, title, onRetry }: { src: string; title: string; onRetry: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [width, setWidth] = useState(0);
  const [drawnPages, setDrawnPages] = useState(0);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Fetch the protected file once per mount; resizing only redraws it.
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let task: ReturnType<Pdfjs["getDocument"]> | null = null;
    void (async () => {
      try {
        const [pdfjs, data] = await Promise.all([
          loadPdfjs(),
          fetchProtectedPdf(src, (input, init) => fetch(input, init), controller.signal),
        ]);
        if (disposed) return;
        task = pdfjs.getDocument({ data, isEvalSupported: false });
        const pdf = await task.promise;
        if (disposed) return;
        setState({ status: "ready", pdf, pageCount: Math.min(pdf.numPages, MAX_PREVIEW_PAGES) });
      } catch (error) {
        if (disposed) return;
        if (error instanceof ProtectedPdfError && error.code === "unauthorized") {
          window.location.assign("/resume-builder");
          return;
        }
        setState({ status: "error" });
      }
    })();
    return () => {
      disposed = true;
      controller.abort();
      void task?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const element = pagesRef.current;
    if (!element) return;
    const measure = () => {
      const next = Math.round(element.clientWidth);
      setWidth((current) => (Math.abs(current - next) > 4 ? next : current));
    };
    if (typeof ResizeObserver === "undefined") {
      const frame = requestAnimationFrame(measure);
      window.addEventListener("resize", measure);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", measure);
      };
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "ready" || width <= 0) return;
    const { pdf, pageCount } = state;
    let cancelled = false;
    let renderTask: { cancel: () => void } | null = null;
    void (async () => {
      try {
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;
          const natural = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: pageRenderScale(natural.width, natural.height, width, window.devicePixelRatio) });
          // Draw off-screen and copy, so a resize never flashes a blank page.
          const buffer = document.createElement("canvas");
          buffer.width = Math.floor(viewport.width);
          buffer.height = Math.floor(viewport.height);
          const task = page.render({ canvas: buffer, viewport });
          renderTask = task;
          await task.promise;
          const canvas = canvasRefs.current[pageNumber - 1];
          if (cancelled || !canvas) return;
          canvas.width = buffer.width;
          canvas.height = buffer.height;
          canvas.getContext("2d")?.drawImage(buffer, 0, 0);
          buffer.width = 0;
          buffer.height = 0;
          setDrawnPages((count) => Math.max(count, pageNumber));
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [state, width]);

  if (state.status === "error") {
    return (
      <div className="rb-pdf-error" role="alert">
        <p><strong>We couldn&apos;t display this preview here.</strong></p>
        <p>Nothing was changed and no AI run was used.</p>
        <button className="rb-button rb-button-primary" type="button" onClick={onRetry}>Try again</button>
        <a className="rb-button rb-button-secondary-dark" href={src} target="_blank" rel="noopener noreferrer">Open in a new tab</a>
      </div>
    );
  }

  const pageCount = state.status === "ready" ? state.pageCount : 0;
  const loading = drawnPages === 0;
  return (
    <>
      <div className="rb-pdf-pages" ref={pagesRef} role="group" aria-label={title} aria-busy={loading}>
        {loading ? <p className="rb-pdf-status" role="status">Loading your protected preview…</p> : null}
        {Array.from({ length: pageCount }, (_, index) => (
          <canvas
            key={index}
            ref={(node) => { canvasRefs.current[index] = node; }}
            role="img"
            aria-label={`${title}, page ${index + 1} of ${pageCount}`}
            data-drawn={index < drawnPages ? "true" : "false"}
          />
        ))}
      </div>
      {state.status === "ready" && state.pdf.numPages > pageCount ? (
        <p className="rb-pdf-status rb-pdf-more">Showing the first {pageCount} of {state.pdf.numPages} pages.</p>
      ) : null}
    </>
  );
}
