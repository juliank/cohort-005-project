import { db } from "~/db";
import {
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
} from "~/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export function getQuizByLessonId(lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

export function getQuizWithQuestions(quizId: number) {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz) return null;

  const questions = db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.position)
    .all();

  const options = db
    .select()
    .from(quizOptions)
    .where(
      inArray(
        quizOptions.questionId,
        questions.map((question) => question.id)
      )
    )
    .all();

  const questionsWithOptions = questions.map((question) => ({
    ...question,
    options: options.filter((option) => option.questionId === question.id),
  }));

  return { ...quiz, questions: questionsWithOptions };
}

export function getBestAttempt(userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

export function calculateGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export type QuestionResult = {
  questionId: number;
  correct: boolean;
  selectedOptionId: number | null;
  correctOptionId: number | null;
};

type QuizQuestion = typeof quizQuestions.$inferSelect;

const GRADED_QUESTION_TYPES = new Set(["multiple_choice", "true_false"]);

/** The first correct option of each question, in one query. */
function correctOptionIds(questions: QuizQuestion[]): Map<number, number> {
  const correctOptions = db
    .select()
    .from(quizOptions)
    .where(
      and(
        inArray(
          quizOptions.questionId,
          questions.map((question) => question.id)
        ),
        eq(quizOptions.isCorrect, true)
      )
    )
    .all();

  const byQuestion = new Map<number, number>();
  for (const option of correctOptions) {
    if (!byQuestion.has(option.questionId)) {
      byQuestion.set(option.questionId, option.id);
    }
  }
  return byQuestion;
}

function gradeQuestion(
  question: QuizQuestion,
  selected: number | undefined,
  correctOptions: Map<number, number>
): QuestionResult {
  if (!selected) {
    return {
      questionId: question.id,
      correct: false,
      selectedOptionId: null,
      correctOptionId: null,
    };
  }
  const correctOptionId = GRADED_QUESTION_TYPES.has(question.questionType)
    ? (correctOptions.get(question.id) ?? null)
    : null;
  return {
    questionId: question.id,
    correct: selected === correctOptionId,
    selectedOptionId: selected,
    correctOptionId,
  };
}

function recordAttempt(
  attempt: { userId: number; quizId: number; score: number; passed: boolean },
  questionResults: QuestionResult[]
) {
  // An attempt without its answers would score a quiz nobody can review.
  return db.transaction((tx) => {
    const saved = tx.insert(quizAttempts).values(attempt).returning().get();

    for (const result of questionResults) {
      if (result.selectedOptionId !== null) {
        tx.insert(quizAnswers)
          .values({
            attemptId: saved.id,
            questionId: result.questionId,
            selectedOptionId: result.selectedOptionId,
          })
          .run();
      }
    }
    return saved;
  });
}

export function computeResult(
  userId: number,
  quizId: number,
  selectedAnswers: Record<number, number>
) {
  try {
    const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
    if (!quiz) {
      console.error("quiz not found");
      return null;
    }

    const questions = db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.position)
      .all();

    const correctOptions = correctOptionIds(questions);
    const questionResults = questions.map((q) =>
      gradeQuestion(q, selectedAnswers[q.id], correctOptions)
    );
    const correct = questionResults.filter((r) => r.correct).length;
    const total = questions.length;

    const scoreValue = total > 0 ? correct / total : 0;
    const passed = scoreValue > 0.7;
    const grade = calculateGrade(scoreValue);

    const attempt = recordAttempt(
      { userId, quizId, score: scoreValue, passed },
      questionResults
    );

    return {
      attemptId: attempt.id,
      score: scoreValue,
      passed,
      grade,
      totalCorrect: correct,
      totalQuestions: total,
      questionResults,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * The lesson's quiz as the learner may see it (no answers), and their best
 * attempt so far.
 */
export function getQuizForLearner(lessonId: number, userId: number | null) {
  const quizRecord = getQuizByLessonId(lessonId);
  if (!quizRecord) return { quiz: null, bestAttempt: null };

  const best = userId ? getBestAttempt(userId, quizRecord.id) : undefined;
  return {
    quiz: toLearnerQuiz(getQuizWithQuestions(quizRecord.id)),
    bestAttempt: best ? { score: best.score, passed: best.passed } : null,
  };
}

function toLearnerQuiz(quizData: ReturnType<typeof getQuizWithQuestions>) {
  if (!quizData) return null;
  // Strip isCorrect from options so answers aren't leaked to the client
  return {
    id: quizData.id,
    title: quizData.title,
    passingScore: quizData.passingScore,
    questions: quizData.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      position: q.position,
      options: q.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
      })),
    })),
  };
}

/** Whether the quiz exists and belongs to this lesson. */
export function isQuizOnLesson(quizId: number, lessonId: number): boolean {
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  return quiz !== undefined && quiz.lessonId === lessonId;
}
