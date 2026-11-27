import { data } from "react-router";
import {
  coursePermissions,
  type CourseRef,
  type DenialReason,
} from "~/modules/permissions/course-permissions.server";
import { db } from "~/db";
import { isBookmarked } from "~/lib/bookmarks.server";
import { getNote } from "~/lib/notes.server";
import { renderMarkdown } from "~/lib/markdown.server";
import {
  calculateWatchProgress,
  flattenCourseLessons,
  getCourseWithDetails,
  getLastWatchPosition,
  getLessonById,
  getLessonProgress,
  getLessonProgressForCourse,
  getLessonThread,
  getModuleById,
  getUserById,
  markLessonInProgress,
  renderThread,
} from "~/lib/lesson-page.server";
import { getQuizForLearner } from "~/lib/lesson-quiz.server";

type CourseWithDetails = NonNullable<ReturnType<typeof getCourseWithDetails>>;
type Lesson = NonNullable<ReturnType<typeof getLessonById>>;

/** Everything the lesson page shows, as far as this person may see it. */
export async function loadLessonPage(request: Request, ref: CourseRef) {
  // Not found covers an unknown course, a malformed lesson id, and a lesson
  // from another course.
  const decisions = await coursePermissions.getCourseDecisions(request, ref);
  if (!decisions.found) {
    throw data("Lesson not found", { status: 404 });
  }

  const lessonId = Number(ref.lessonId);
  const courseWithDetails = getCourseWithDetails(decisions.course.id);
  const lesson = getLessonById(lessonId);
  const mod = lesson ? getModuleById(lesson.moduleId) : undefined;
  if (!courseWithDetails || !lesson || !mod) {
    throw data("Lesson not found", { status: 404 });
  }

  const shared = {
    course: {
      id: courseWithDetails.id,
      title: courseWithDetails.title,
      slug: courseWithDetails.slug,
    },
    curriculum: toCurriculum(courseWithDetails),
    module: { id: mod.id, title: mod.title },
    enrolled: decisions.enrolled,
  };

  // Someone who can't view the content gets the lesson's title, its module and
  // the course outline — never the body, video or quiz — plus the reason, so
  // the page can show the right call to action.
  if (!decisions.view.allowed) {
    const lockedReason: DenialReason = decisions.view.reason;
    return {
      view: "locked" as const,
      ...shared,
      lesson: { id: lesson.id, title: lesson.title },
      lockedReason,
    };
  }

  const currentUserId = decisions.person?.id ?? null;
  // Progress is recorded only for people who can take the course, so a
  // Student under a Country Lock gets none.
  const progress =
    currentUserId && decisions.take.allowed
      ? loadProgress(currentUserId, lesson, decisions.course.id)
      : NO_PROGRESS;

  return {
    view: "full" as const,
    ...shared,
    lesson,
    currentUserId,
    ...progress,
    ...(await loadContent(lesson, courseWithDetails, currentUserId)),
    canModerate: decisions.manage.allowed,
    instructorName:
      getUserById(decisions.course.instructorId)?.name ?? "your instructor",
  };
}

function toCurriculum(course: CourseWithDetails) {
  return course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
    })),
  }));
}

const NO_PROGRESS = {
  lessonStatus: null as string | null,
  lastWatchPosition: 0,
  watchProgress: 0,
  lessonProgressMap: {} as Record<number, string>,
};

function loadProgress(userId: number, lesson: Lesson, courseId: number) {
  markLessonInProgress(userId, lesson.id);
  const progress = getLessonProgress(userId, lesson.id);

  const lessonProgressMap: Record<number, string> = {};
  for (const record of getLessonProgressForCourse(userId, courseId)) {
    lessonProgressMap[record.lessonId] = record.status;
  }

  return {
    lessonStatus: progress?.status ?? null,
    ...loadWatchState(userId, lesson),
    lessonProgressMap,
  };
}

/** Video watch state for resume and progress display. */
function loadWatchState(userId: number, lesson: Lesson) {
  if (!lesson.videoUrl) return { lastWatchPosition: 0, watchProgress: 0 };

  const videoDurationSeconds = (lesson.durationMinutes ?? 0) * 60;
  return {
    lastWatchPosition: getLastWatchPosition(userId, lesson.id),
    watchProgress:
      videoDurationSeconds > 0
        ? calculateWatchProgress(userId, lesson.id, videoDurationSeconds)
        : 0,
  };
}

/**
 * Everything behind the can-view-content bar: comments, Bookmarks and Notes
 * are confidential to the course.
 */
async function loadContent(
  lesson: Lesson,
  course: CourseWithDetails,
  currentUserId: number | null
) {
  const note = currentUserId
    ? getNote(db, currentUserId, lesson.id)
    : undefined;

  const contentHtml = lesson.content
    ? await renderMarkdown(lesson.content)
    : null;

  return {
    contentHtml,
    ...neighbours(course, lesson.id),
    ...getQuizForLearner(lesson.id, currentUserId),
    comments: await renderThread(getLessonThread(lesson.id)),
    bookmarked: currentUserId
      ? isBookmarked(db, currentUserId, lesson.id)
      : false,
    note: note ? { body: note.body, updatedAt: note.updatedAt } : null,
  };
}

function neighbours(course: CourseWithDetails, lessonId: number) {
  const allLessons = flattenCourseLessons(course);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  return {
    prevLesson: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
    nextLesson:
      currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]
        : null,
  };
}
