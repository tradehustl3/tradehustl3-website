'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { AMAZON_KINDLE, AMAZON_PAPERBACK, DIRECT_EBOOK } from './book/editions';
import { ConversionCta } from './conversion-cta';
import styles from './home-storefront.module.css';

const FORMATS = [
  ['Paperback', AMAZON_PAPERBACK.url, 'amazon-paperback', styles.paperback],
  ['Kindle', AMAZON_KINDLE.url, 'amazon-kindle', styles.kindle],
  ['Direct PDF', DIRECT_EBOOK.url, 'direct-ebook', styles.directPdf],
] as const;

// Fitting tips on the worker image, normalized to the trimmed image bounds.
const MANIFOLD_PORTS = [[.813, .453], [.854, .452], [.896, .452]] as const;

export function HomeBookFormats() {
  const formatRow = useRef<HTMLDivElement>(null);
  const worker = useRef<HTMLImageElement>(null);
  const hoses = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const row = formatRow.current;
    const image = worker.current;
    const canvas = hoses.current;
    const context = canvas?.getContext('2d');
    if (!row || !image || !canvas || !context) return;

    const links = Array.from(row.querySelectorAll('a'));
    let frame = 0;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!image.naturalWidth || !bounds.width) return;
      const figure = image.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * density);
      canvas.height = Math.round(bounds.height * density);
      context.setTransform(density, 0, 0, density, 0, 0);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      links.forEach((link, index) => {
        const [portX, portY] = MANIFOLD_PORTS[index];
        const button = link.getBoundingClientRect();
        const color = getComputedStyle(link).getPropertyValue('--format-accent').trim();
        const startX = figure.left + figure.width * portX - bounds.left;
        const startY = figure.top + figure.height * portY - bounds.top;
        const endX = button.left + button.width / 2 - bounds.left;
        const endY = button.bottom + 3 - bounds.top;
        const lowY = Math.min(bounds.height - 8, startY + 23 + 10 * index);
        // A nearby button needs room for its hose to pass beside the gauge before turning up.
        const riseX = Math.max(endX, figure.right + 12 - bounds.left);
        const riseY = endY + (riseX > endX ? 24 : 12);
        const turn = Math.min(38, Math.max(8, (riseX - startX) * .35));

        context.beginPath();
        context.moveTo(startX, startY);
        context.bezierCurveTo(startX, lowY, riseX - turn, lowY, riseX, riseY);
        context.bezierCurveTo(riseX, endY + 9, endX, endY + 9, endX, endY);
        context.strokeStyle = '#020914';
        context.lineWidth = 5.4;
        context.stroke();
        context.strokeStyle = color;
        context.lineWidth = 3.4;
        context.shadowColor = color;
        context.shadowBlur = 4;
        context.stroke();
        context.shadowBlur = 0;
        context.strokeStyle = '#fff7';
        context.lineWidth = .8;
        context.stroke();
      });
    };

    function scheduleDraw() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleDraw);
    for (const element of [row, image, ...links]) observer?.observe(element);
    image.addEventListener('load', scheduleDraw);
    window.addEventListener('resize', scheduleDraw);
    scheduleDraw();

    return () => {
      observer?.disconnect();
      image.removeEventListener('load', scheduleDraw);
      window.removeEventListener('resize', scheduleDraw);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.bookFormatDisplay}>
      <div ref={formatRow} className={styles.bookFormats} role="group" aria-label="Buy the book">
        {FORMATS.map(([label, href, cta, className]) => (
          <ConversionCta key={cta} variant="format" className={className} href={href} rel="noopener"
            data-cta={cta} data-item={cta} data-cta-location="homepage_book_formats">{label}</ConversionCta>
        ))}
      </div>
      <div className={styles.hvacRig} aria-hidden="true">
        <Image ref={worker} className={styles.kneelingHvac} src="/optimized/atmosphere/worker-kneeling-hvac.webp"
          alt="" width={319} height={404} />
        <canvas ref={hoses} className={styles.hvacHoses} />
      </div>
    </div>
  );
}
