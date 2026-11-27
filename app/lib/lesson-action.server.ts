import { data } from "react-router";
import { z } from "zod";
import {
  coursePermissions,
  type Capability,
  type CourseRef,
} from "~/modules/permissions/course-permissions.server";
import { db } from "~/db";
import {
  createComment,
  deleteComment,
  editComment,
} from "~/lib/comments.server";
import { defaultNotifications } from "~/lib/notifications.server";
import { toggleBookmark } from "~/lib/bookmarks.server";
import { saveNote } from "~/lib/notes.server";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { parseFormData } from "~/lib/validation";
import { getCommentById, markLessonComplete } from "~/lib/lesson-page.server";
import { computeResult, isQuizOnLesson } from "~/lib/lesson-quiz.server";

const createCommentSchema = z.object({
  intent: z.literal("create-comment"),
  body: z.string(),
  parentId: z.coerce.number().int().optional(),
});

const editCommentSchema = z.object({
  intent: z.literal("edit-comment"),
  commentId: z.coerce.number().int(),
  body: z.string(),
});

const saveNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something before saving your note.")
    .max(
      MAX_NOTE_LENGTH,
      `Your note is over ${MAX_NOTE_LENGTH.toLocaleString("en")} characters, so it was not saved.`
    ),
});

const submitQuizSchema = z.object({
  quizId: z.coerce.number().int().positive(),
});

const answerSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive(),
});

const deleteCommentSchema = z.object({
  intent: z.literal("delete-comment"),
  commentId: z.coerce.number().int(),
});

/**
 * What each action intent needs: comments, Bookmarks and Notes need view;
 * progress and quizzes need take. Moderating Discussions (deleting someone
 * else's post) additionally needs manage, checked in the delete intent.
 */
const INTENT_CAPABILITY: Record<string, Capability | undefined> = {
  "create-comment": "view",
  "edit-comment": "view",
  "delete-comment": "view",
  "toggle-bookmark": "view",
  "save-note": "view",
  "mark-complete": "take",
  "submit-quiz": "take",
};

type Person = Awaited<
  ReturnType<typeof coursePermissions.requireCapability>
>["person"];

type IntentContext = {
  formData: FormData;
  person: Person;
  ref: CourseRef;
  lessonId: number;
};

type IntentHandler = (context: IntentContext) => unknown;

const HANDLERS: Record<string, IntentHandler> = {
  "create-comment": (context) => commentIntent(context, createCommentIntent),
  "edit-comment": (context) => commentIntent(context, editCommentIntent),
  "delete-comment": (context) => commentIntent(context, deleteCommentIntent),
  "toggle-bookmark": ({ person, lessonId }) => ({
    ok: true,
    bookmarked: toggleBookmark(db, person.id, lessonId, new Date()),
  }),
  "save-note": saveNoteIntent,
  "mark-complete": ({ person, lessonId }) => {
    markLessonComplete(person.id, lessonId);
    return { success: true };
  },
  "submit-quiz": submitQuizIntent,
};

/** Runs one posted intent on a lesson, after checking its capability. */
export async function handleLessonAction(request: Request, ref: CourseRef) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Every intent checks its own capability here — loader guards don't protect
  // actions. The ref includes the lesson, so a lesson from another course (or
  // a malformed id) is a 404.
  const capability =
    typeof intent === "string" ? INTENT_CAPABILITY[intent] : undefined;
  const handler = typeof intent === "string" ? HANDLERS[intent] : undefined;
  if (!capability || !handler) {
    throw data("Invalid action", { status: 400 });
  }
  const { person } = await coursePermissions.requireCapability(
    request,
    capability,
    ref
  );
  return handler({ formData, person, ref, lessonId: Number(ref.lessonId) });
}

async function commentIntent(
  context: IntentContext,
  run: (context: IntentContext) => Promise<unknown>
) {
  try {
    return await run(context);
  } catch (error) {
    // Service validation failures are user-correctable; anything thrown as a
    // Response (404 below) should keep bubbling.
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

/**
 * Scope the id to this lesson so a comment elsewhere can't be reached by
 * posting its id to this route.
 */
function requireCommentOnLesson(commentId: number, lessonId: number) {
  const existing = getCommentById(commentId);
  if (!existing || existing.lessonId !== lessonId) {
    throw data("Comment not found", { status: 404 });
  }
}

async function createCommentIntent({
  formData,
  person,
  lessonId,
}: IntentContext) {
  const parsed = parseFormData(formData, createCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before posting." };
  }
  const created = await createComment(
    db,
    person.id,
    lessonId,
    parsed.data.parentId ?? null,
    parsed.data.body,
    new Date(),
    await defaultNotifications()
  );
  if (!created.ok) return created;
  return { ok: true };
}

async function editCommentIntent({
  formData,
  person,
  lessonId,
}: IntentContext) {
  const parsed = parseFormData(formData, editCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before saving." };
  }
  requireCommentOnLesson(parsed.data.commentId, lessonId);
  const edited = editComment(
    db,
    parsed.data.commentId,
    person.id,
    parsed.data.body,
    new Date()
  );
  if (!edited.ok) return edited;
  return { ok: true };
}

async function deleteCommentIntent({
  formData,
  person,
  ref,
  lessonId,
}: IntentContext) {
  const parsed = parseFormData(formData, deleteCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Could not delete that comment." };
  }
  requireCommentOnLesson(parsed.data.commentId, lessonId);
  // Anyone who can view may delete their own posts; moderating someone
  // else's takes the manage capability.
  const decisions = coursePermissions.decide(person, ref);
  const canModerate = decisions.found && decisions.manage.allowed;
  const deleted = await deleteComment(
    db,
    parsed.data.commentId,
    person.id,
    canModerate,
    new Date(),
    await defaultNotifications()
  );
  if (!deleted.ok) return deleted;
  return { ok: true };
}

function saveNoteIntent({ formData, person, lessonId }: IntentContext) {
  const parsed = parseFormData(formData, saveNoteSchema);
  if (!parsed.success) {
    return { ok: false, error: parsed.errors.body };
  }
  const saved = saveNote(db, person.id, lessonId, parsed.data.body, new Date());
  if (!saved.ok) return saved;
  return { ok: true };
}

function submitQuizIntent({ formData, person, lessonId }: IntentContext) {
  const parsed = parseFormData(formData, submitQuizSchema);
  if (!parsed.success) {
    throw data("Invalid quiz ID", { status: 400 });
  }
  const { quizId } = parsed.data;
  // Scope the quiz to this lesson so a quiz elsewhere can't be reached by
  // posting its id to this route.
  if (!isQuizOnLesson(quizId, lessonId)) {
    throw data("Quiz not found", { status: 404 });
  }

  const result = computeResult(person.id, quizId, selectedAnswers(formData));
  if (!result) {
    throw data("Failed to score quiz", { status: 500 });
  }
  return { quizResult: result };
}

/** Form fields named "question-{questionId}" with value = optionId. */
function selectedAnswers(formData: FormData): Record<number, number> {
  const answers: Record<number, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("question-")) continue;
    const answer = answerSchema.safeParse({
      questionId: key.slice("question-".length),
      optionId: value,
    });
    if (answer.success) {
      answers[answer.data.questionId] = answer.data.optionId;
    }
  }
  return answers;
}
