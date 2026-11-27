import { formatRelativeTime } from "~/lib/utils";

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
  // The server trims before it saves, so compare what it would store.
  const trimmed = draft.trim();
  const dirty = trimmed !== (saved?.body ?? "");
  const empty = trimmed.length === 0;

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
    const ago = now === null ? "" : formatRelativeTime(saved.updatedAt, now);
    return { tone: "muted", text: ago ? `Saved ${ago}` : "Saved" };
  }
  return { tone: "none" };
}
