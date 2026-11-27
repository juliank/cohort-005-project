import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

type LessonLink = { id: number; title: string } | null;

export function LessonPrevNext({
  course,
  prevLesson,
  nextLesson,
}: {
  course: { title: string; slug: string };
  prevLesson: LessonLink;
  nextLesson: LessonLink;
}) {
  return (
    <div className="flex items-center justify-between border-t pt-6">
      {prevLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${prevLesson.id}`}
          className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          <NavLabel caption="Previous" title={prevLesson.title} />
        </Link>
      ) : (
        <div />
      )}

      {nextLesson ? (
        <Link
          to={`/courses/${course.slug}/lessons/${nextLesson.id}`}
          className="flex items-center gap-2 text-right text-sm hover:text-foreground text-muted-foreground"
        >
          <NavLabel caption="Next" title={nextLesson.title} />
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <Link
          to={`/courses/${course.slug}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <NavLabel caption="Back to" title={course.title} />
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function NavLabel({ caption, title }: { caption: string; title: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{caption}</div>
      <div className="font-medium text-foreground">{title}</div>
    </div>
  );
}
