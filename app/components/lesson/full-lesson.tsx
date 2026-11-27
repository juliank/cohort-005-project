import type { Route } from "../../routes/+types/courses.$slug.lessons.$lessonId";
import { LessonNote } from "~/components/lesson-note";
import { CommentThread } from "~/components/comment-thread";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Clock, Github } from "lucide-react";
import { formatDuration } from "~/lib/utils";
import { YouTubePlayer } from "~/components/youtube-player";
import { useAutoplay } from "./use-autoplay";
import { LessonBreadcrumb } from "./lesson-breadcrumb";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { BookmarkToggle } from "./bookmark-toggle";
import { LessonQuizSection } from "./quiz-section";
import { LessonCompletion } from "./lesson-completion";
import { LessonPrevNext } from "./lesson-prev-next";

type FullLessonData = Extract<
  Route.ComponentProps["loaderData"],
  { view: "full" }
>;
type Lesson = FullLessonData["lesson"];

export function FullLesson({ data }: { data: FullLessonData }) {
  const { course, lesson, enrolled, currentUserId, quiz } = data;
  const canTrack = enrolled && !!currentUserId;

  return (
    <div className="flex">
      <CurriculumSidebar
        course={course}
        curriculum={data.curriculum}
        currentLessonId={lesson.id}
        lessonProgressMap={data.lessonProgressMap}
        enrolled={enrolled}
      />

      <div className="flex-1 p-6 lg:p-8">
        <LessonBreadcrumb
          course={course}
          mod={data.module}
          lessonTitle={lesson.title}
        />

        <div className="mx-auto max-w-4xl">
          <LessonHeader
            lesson={lesson}
            bookmarked={currentUserId ? data.bookmarked : null}
          />

          <LessonMedia data={data} canTrack={canTrack} />

          <LessonContent
            contentHtml={data.contentHtml}
            hasVideo={!!lesson.videoUrl}
          />

          {quiz && canTrack && (
            <LessonQuizSection
              lessonId={lesson.id}
              quiz={quiz}
              bestAttempt={data.bestAttempt}
            />
          )}

          <LessonFooter data={data} canTrack={canTrack} />
        </div>
      </div>
    </div>
  );
}

/** `bookmarked` is null when nobody is signed in, so there is no toggle. */
function LessonHeader({
  lesson,
  bookmarked,
}: {
  lesson: Lesson;
  bookmarked: boolean | null;
}) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {bookmarked !== null && <BookmarkToggle bookmarked={bookmarked} />}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {formatDuration(lesson.durationMinutes, true, false, false)}
          </div>
        )}
        {lesson.githubRepoUrl && (
          <a
            href={lesson.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Github className="mr-1.5 size-4" />
              Open Code
            </Button>
          </a>
        )}
      </div>
    </>
  );
}

function LessonContent({
  contentHtml,
  hasVideo,
}: {
  contentHtml: string | null;
  hasVideo: boolean;
}) {
  if (contentHtml) {
    return (
      <div
        className="prose prose-neutral dark:prose-invert mb-8 max-w-none"
        // oxlint-disable-next-line react/no-danger -- the instructor wrote this Markdown
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    );
  }
  if (hasVideo) return null;
  return (
    <Card className="mb-8">
      <CardContent className="py-12 text-center text-muted-foreground">
        No content has been added to this lesson yet.
      </CardContent>
    </Card>
  );
}

function LessonMedia({
  data,
  canTrack,
}: {
  data: FullLessonData;
  canTrack: boolean;
}) {
  const { lesson, currentUserId } = data;
  const [autoplay, toggleAutoplay] = useAutoplay();
  return (
    <>
      {lesson.videoUrl && (
        <YouTubePlayer
          videoUrl={lesson.videoUrl}
          lessonId={lesson.id}
          title={lesson.title}
          startPosition={data.lastWatchPosition}
          durationMinutes={lesson.durationMinutes}
          watchProgress={data.watchProgress}
          trackingEnabled={canTrack}
          autoplay={autoplay}
          onToggleAutoplay={toggleAutoplay}
        />
      )}

      {/* Note — under the video, so the Student can write while they watch */}
      {currentUserId && <LessonNote key={lesson.id} note={data.note} />}
    </>
  );
}

function LessonFooter({
  data,
  canTrack,
}: {
  data: FullLessonData;
  canTrack: boolean;
}) {
  const { course, lesson, currentUserId } = data;
  return (
    <>
      {canTrack && (
        <div className="mb-8">
          <LessonCompletion
            courseSlug={course.slug}
            lessonId={lesson.id}
            lessonStatus={data.lessonStatus}
            nextLesson={data.nextLesson}
          />
        </div>
      )}

      {/* Questions & Discussion — confidential to people with access */}
      <CommentThread
        comments={data.comments}
        currentUserId={currentUserId}
        canModerate={data.canModerate}
        canPost
        instructorName={data.instructorName}
      />

      <LessonPrevNext
        course={course}
        prevLesson={data.prevLesson}
        nextLesson={data.nextLesson}
      />
    </>
  );
}
