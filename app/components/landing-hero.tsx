import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CourseByline } from "~/components/course-byline";
import { CourseImage } from "~/components/course-image";
import { cn } from "~/lib/utils";
import type { HeroAction } from "~/modules/landing";

export type HeroCourse = {
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  instructorName: string | null;
  categoryName: string | null;
  lessonCount: number;
};

export function LandingHero({
  actions,
  course,
}: {
  actions: HeroAction[];
  course: HeroCourse | undefined;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5"
      />
      <div
        className={cn(
          "relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:py-28",
          course && "lg:grid-cols-[1.1fr_1fr]"
        )}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Self-paced courses for developers
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Learn to code,
            <br />
            <span className="text-muted-foreground">at your own pace</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Structured courses built by experienced instructors. Track your
            progress, take quizzes, and build real-world skills.
          </p>
          <HeroActionButtons actions={actions} />
        </div>
        {course && <HeroCoursePreview course={course} />}
      </div>
    </section>
  );
}

function HeroCoursePreview({ course }: { course: HeroCourse }) {
  return (
    <div className="relative hidden lg:block">
      <div
        aria-hidden
        className="absolute -inset-4 rotate-3 rounded-2xl bg-primary/10"
      />
      <Link
        to={`/courses/${course.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-shadow hover:shadow-2xl"
      >
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <div className="p-6">
          {course.categoryName && (
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {course.categoryName}
            </p>
          )}
          <h2 className="mt-2 text-xl font-semibold leading-snug group-hover:text-primary">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
          <CourseByline
            className="mt-4"
            instructorName={course.instructorName}
            lessonCount={course.lessonCount}
          />
        </div>
      </Link>
    </div>
  );
}

function HeroActionButtons({ actions }: { actions: HeroAction[] }) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-4">
      {actions.map((action) => (
        <Button
          key={action.to}
          asChild
          size="lg"
          variant={action.emphasis === "primary" ? "default" : "outline"}
        >
          <Link to={action.to}>
            {action.label}
            {action.emphasis === "primary" && (
              <ArrowRight className="ml-2 size-4" />
            )}
          </Link>
        </Button>
      ))}
    </div>
  );
}
