/** Deadline line under a correction form. Downloads are unaffected, so the ended state says so. */
export function CorrectionWindowNote({ expireAt, expired }: { expireAt?: number | null; expired?: boolean }) {
  if (expired) {
    return (
      <p className="rb-correction-window" data-correction-window="ended">
        Your seven-day correction period has ended. Your PDF and DOCX downloads stay available.
      </p>
    );
  }
  if (typeof expireAt !== "number") return null;
  const date = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(expireAt * 1000));
  return (
    <p className="rb-correction-window" data-correction-window="open">
      Corrections available until {date}.
    </p>
  );
}
