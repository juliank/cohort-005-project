export type SavedNote = { body: string; updatedAt: string };

export type NoteEditorInput = {
  draft: string;
  saved: SavedNote | null;
  isSaving: boolean;
  error: string | undefined;
  maxLength: number;
  /** Null until the client knows the time, so server and client render alike. */
  now: number | null;
};

export type NoteStatus =
  | { tone: "error"; text: string }
  | { tone: "muted"; text: string }
  | { tone: "none" };

export type NoteEditorView = {
  canSave: boolean;
  saveLabel: string;
  counter: string;
  overLimit: boolean;
  status: NoteStatus;
};

export function describeNoteEditor(input: NoteEditorInput): NoteEditorView {
  const { draft, saved, isSaving, error, maxLength, now } = input;
  const overLimit = draft.length > maxLength;
  const dirty = draft !== (saved?.body ?? "");
  const empty = draft.trim().length === 0;

  return {
    canSave: dirty && !empty && !overLimit && !isSaving,
    saveLabel: isSaving ? "Saving..." : "Save note",
    counter: `${draft.length} / ${maxLength}`,
    overLimit,
    status: statusFor({ dirty, isSaving, error, saved, now }),
  };
}

function statusFor({
  dirty,
  isSaving,
  error,
  saved,
  now,
}: {
  dirty: boolean;
  isSaving: boolean;
  error: string | undefined;
  saved: SavedNote | null;
  now: number | null;
}): NoteStatus {
  if (isSaving) return { tone: "none" };
  if (error) return { tone: "error", text: error };
  if (dirty) return { tone: "muted", text: "Unsaved changes" };
  if (saved) {
    const text =
      now === null ? "Saved" : `Saved ${relativeTime(saved.updatedAt, now)}`;
    return { tone: "muted", text };
  }
  return { tone: "none" };
}

function relativeTime(iso: string, now: number): string {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed) || elapsed < 60_000) return "just now";

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}
