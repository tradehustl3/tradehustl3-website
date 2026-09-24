/** Upload edits are coalesced for this long before a draft save; never one save per keystroke. */
export const UPLOAD_SAVE_DEBOUNCE_MS = 600;

/** Serialize draft writes and return only after this snapshot is acknowledged. */
export function createDraftSaver(write: (body: string, id: string) => Promise<string>) {
  let id = "";
  let saved = "";
  let tail: Promise<unknown> = Promise.resolve();
  return {
    hydrate(resumeId: string, serialized: string) { id = resumeId; saved = serialized; },
    save(serialized: string): Promise<string> {
      const next = tail.catch(() => undefined).then(async () => {
        if (id && serialized === saved) return id;
        const nextId = await write(serialized, id);
        if (!nextId) throw new Error("We could not save your progress.");
        id = nextId;
        saved = serialized;
        return id;
      });
      tail = next;
      return next;
    },
  };
}
