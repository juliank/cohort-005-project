import { useFetcher } from "react-router";
import type { Route } from "../../routes/+types/courses.$slug.lessons.$lessonId";
import { Button } from "~/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";

export type LessonLoaderData = Route.ComponentProps["loaderData"];

export function BookmarkToggle({ bookmarked }: { bookmarked: boolean }) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const isSaving = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="toggle-bookmark" />
      <Button type="submit" variant="outline" size="sm" disabled={isSaving}>
        {bookmarked ? (
          <BookmarkCheck className="mr-1.5 size-4" />
        ) : (
          <Bookmark className="mr-1.5 size-4" />
        )}
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </Button>
    </fetcher.Form>
  );
}
