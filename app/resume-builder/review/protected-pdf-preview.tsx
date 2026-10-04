"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "../pdfjs";
import {
  MAX_PREVIEW_PAGES,
  ProtectedPdfError,
  fetchProtectedPdf,
  pageRenderScale,
} from "./protected-pdf";

type Pdfjs = Awaited<ReturnType<typeof loadPdfjs>>;
type PdfDocument = Awaited<ReturnType<Pdfjs["getDocument"]>["promise"]>;
type LoadState =
  | { status: "loading" }
  | { status: "ready"; pdf: PdfDocument; pageCount: number }
  | { status: "error" };

/** Controlled canvas preview on every device. No native viewer or text layer. */
export function ProtectedPdfPreview({ src, title }: { src: string; title: string }) {
  const [attempt, setAttempt] = useState(0);
  return <CanvasPdfPreview key={`${src}#${attempt}`} src={src} title={title} onRetry={() => setAttempt((value) => value + 1)} />;
}

function CanvasPdfPreview({ src, title, onRetry }: { src: string; title: string; onRetry: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
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
          const viewport = page.getViewport({ scale: pageRenderScale(natural.width, natural.height, width * zoom, window.devicePixelRatio) });
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
          canvas.style.width = `${width * zoom}px`;
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
  }, [state, width, zoom]);

  if (state.status === "error") {
    return (
      <div className="rb-pdf-error" role="alert">
        <p><strong>We couldn&apos;t display this preview here.</strong></p>
        <p>Nothing was changed and no AI run was used.</p>
        <button className="rb-button rb-button-primary" type="button" onClick={onRetry}>Try again</button>

      </div>
    );
  }

  const pageCount = state.status === "ready" ? state.pageCount : 0;
  const loading = drawnPages === 0;
  return (
    <>
      <div className="rb-pdf-controls" role="toolbar" aria-label="Preview controls">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))}>−</button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.25))}>+</button>
        <button type="button" onClick={() => setZoom(1)}>Fit to width</button>
        <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage(value => value - 1)}>←</button>
        <span aria-live="polite">{currentPage} / {pageCount || '…'}</span>
        <button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setCurrentPage(value => value + 1)}>→</button>
      </div>
      <div className="rb-pdf-pages" ref={pagesRef} role="group" aria-label={title} aria-busy={loading}>
        {loading ? <p className="rb-pdf-status" role="status">Loading your protected preview…</p> : null}
        {Array.from({ length: pageCount }, (_, index) => (
          <canvas
            key={index}
            hidden={index + 1 !== currentPage}
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
