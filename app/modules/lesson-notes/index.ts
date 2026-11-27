import { describeNoteEditor as describe } from "./lib/note-editor";
import type { NoteEditorInput, NoteEditorView } from "./lib/note-editor";

export type {
  NoteEditorInput,
  NoteEditorView,
  NoteStatus,
  SavedNote,
} from "./lib/note-editor";

/**
 * What the lesson note editor shows for a draft: whether Save is enabled,
 * the character counter, and the status line beside the button.
 */
export function describeNoteEditor(input: NoteEditorInput): NoteEditorView {
  return describe(input);
}
