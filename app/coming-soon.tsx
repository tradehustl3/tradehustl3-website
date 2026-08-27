'use client';

import { useEffect, useRef } from 'react';

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
        <span className="tool-badge">COMING NEXT</span>
        <span className="tool-index" aria-hidden="true">03</span>
        <span className="tool-card-title">ENTER. EARN. ELEVATE.</span>
        <span className="tool-card-copy">Get in. Build value. Stack experience. Move like you mean it.</span>
        <span className="tool-cta">NEXT LEVEL COMING SOON <span aria-hidden="true">→</span></span>
      </button>
      <dialog ref={dialogRef} className="coming-soon-dialog" aria-labelledby="coming-soon-title">
        <p className="tool-badge">COMING NEXT</p>
        <p id="coming-soon-title">
          MORE TRADE HUSTL3 TOOLS ARE ON THE WAY.
          <br />
          STAY READY.
        </p>
        <button type="button" className="button" onClick={() => dialogRef.current?.close()}>
          Got it
        </button>
      </dialog>
    </>
  );
}
