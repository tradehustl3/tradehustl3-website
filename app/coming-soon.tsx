'use client';

import { useEffect, useRef } from 'react';

const MESSAGE = 'MORE TRADE HUSTL3 TOOLS ARE ON THE WAY. STAY READY.';

export function ComingSoon() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Native <dialog> handles Esc and focus trapping; add backdrop-click to dismiss.
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener('click', onClick);
    return () => dialog.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <button
        type="button"
        className="tool-card is-next"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="tool-badge">Coming next</span>
        <span className="tool-index" aria-hidden="true">03</span>
        <span className="tool-card-title">Enter. Earn. Elevate.</span>
        <span className="tool-card-copy">Apply, build experience, increase your value, and work toward ownership.</span>
        <span className="tool-cta">See what&apos;s next <span aria-hidden="true">→</span></span>
      </button>
      <dialog ref={dialogRef} className="coming-soon-dialog" aria-labelledby="coming-soon-title">
        <p className="tool-badge">Coming next</p>
        <p id="coming-soon-title">{MESSAGE}</p>
        <button type="button" className="button" onClick={() => dialogRef.current?.close()}>
          Got it
        </button>
      </dialog>
    </>
  );
}
