import { useState } from "react";
import type { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { HelpCircle } from "lucide-react";
import type { LessonQuiz, QuizQuestion } from "./quiz-types";

type Answers = Record<number, number>;

export function QuizFormCard({
  quiz,
  quizFetcher,
  isSubmitting,
  onSubmit,
}: {
  quiz: LessonQuiz;
  quizFetcher: ReturnType<typeof useFetcher>;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const [selectedAnswers, onSelect] = useQuizAnswers();
  const allAnswered = quiz.questions.every(
    (q) => selectedAnswers[q.id] !== undefined
  );

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="size-5 text-primary" />
          <h2 className="text-xl font-semibold">{quiz.title}</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Answer all questions and submit. Passing score:{" "}
          {Math.round(quiz.passingScore * 100)}%.
        </p>

        <quizFetcher.Form method="post" onSubmit={onSubmit}>
          <input type="hidden" name="intent" value="submit-quiz" />
          <input type="hidden" name="quizId" value={quiz.id} />

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
              <QuizQuestionField
                key={question.id}
                question={question}
                number={qIndex + 1}
                selectedOptionId={selectedAnswers[question.id]}
                onSelect={onSelect}
              />
            ))}
          </div>

          <SubmitQuizRow
            allAnswered={allAnswered}
            isSubmitting={isSubmitting}
          />
        </quizFetcher.Form>
      </CardContent>
    </Card>
  );
}

function QuizQuestionField({
  question,
  number,
  selectedOptionId,
  onSelect,
}: {
  question: QuizQuestion;
  number: number;
  selectedOptionId: number | undefined;
  onSelect: (questionId: number, optionId: number) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-3 font-medium">
        {number}. {question.questionText}
      </p>
      <div className="space-y-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={selectedOptionId === option.id}
              onChange={() => onSelect(question.id, option.id)}
              className="size-4 accent-primary"
            />
            <span className="text-sm">{option.optionText}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SubmitQuizRow({
  allAnswered,
  isSubmitting,
}: {
  allAnswered: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="mt-6">
      <Button type="submit" disabled={!allAnswered || isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Quiz"}
      </Button>
      {!allAnswered && (
        <p className="mt-2 text-sm text-muted-foreground">
          Please answer all questions before submitting.
        </p>
      )}
    </div>
  );
}

/** Starts empty each time the form mounts, which is how a retake clears it. */
function useQuizAnswers() {
  const [selectedAnswers, setSelectedAnswers] = useState<Answers>({});
  const onSelect = (questionId: number, optionId: number) =>
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  return [selectedAnswers, onSelect] as const;
}
