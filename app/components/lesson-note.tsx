import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import {
  describeNoteEditor,
  type NoteEditorView,
  type SavedNote,
} from "~/modules/lesson-notes";

/**
 * The Student's private note on a lesson. Laid out like the Questions &
 * Discussion card further down the page, so the two read as one family.
 */
export function LessonNote({ note }: { note: SavedNote | null }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const now = useClientNow(note?.updatedAt);
  const view = describeNoteEditor({
    draft,
    saved: note,
    isSaving: fetcher.state !== "idle",
    error: fetcher.data?.error,
    maxLength: MAX_NOTE_LENGTH,
    now,
  });

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <NoteHeader />
        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
          />
          <NoteFooter view={view} />
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

/** The server cannot know the reader's clock; read it after hydration. */
function useClientNow(updatedAt: string | undefined): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [updatedAt]);
  return now;
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <NotebookPen className="size-5 text-primary" />
      <h2 className="text-xl font-semibold">Your notes</h2>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see these
      </span>
    </div>
  );
}

function NoteFooter({ view }: { view: NoteEditorView }) {
  const { status } = view;
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={!view.canSave}>
        {view.saveLabel}
      </Button>

      {status.tone !== "none" && (
        <span
          className={cn(
            "text-xs",
            status.tone === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {status.text}
        </span>
      )}

      <span
        className={cn(
          "ml-auto text-xs",
          view.overLimit ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {view.counter}
      </span>
    </div>
  );
}
