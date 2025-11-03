"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface QuestionOption {
  id: string
  option_text: string
}

interface QuizQuestion {
  id: string
  question_text: string
  question_type: string
  correct_answer: string
  points: number
  question_options: QuestionOption[]
}

interface StudentAnswer {
  id: string
  question_id: string
  student_answer: string
  is_correct: boolean
  points_earned: number
  quiz_questions: QuizQuestion
}

interface Result {
  id: string
  score: number
  total_points: number
  completed_at: string
  student_answers: StudentAnswer[]
}

export function QuizResults({ attempt, quizId }: { attempt: Result; quizId: string }) {
  const totalPoints = attempt.total_points || 0
  const score = attempt.score || 0
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0
  const status =
    percentage >= 80
      ? "Excellent!"
      : percentage >= 60
        ? "Good Job!"
        : percentage >= 40
          ? "Keep Practicing"
          : "Try Again"

  const getAnswerDisplayText = (answer: StudentAnswer): string => {
    const question = answer.quiz_questions
    const studentAnswer = answer.student_answer

    if (question.question_type === "multiple_choice") {
      const option = question.question_options.find((opt) => opt.id === studentAnswer)
      return option ? option.option_text : "No answer provided"
    } else if (question.question_type === "true_false") {
      return studentAnswer === "true" ? "True" : studentAnswer === "false" ? "False" : "No answer provided"
    } else {
      return studentAnswer || "No answer provided"
    }
  }

  const getCorrectAnswerDisplayText = (answer: StudentAnswer): string => {
    const question = answer.quiz_questions

    if (question.question_type === "multiple_choice") {
      // Try match by option id first
      const optionById = question.question_options.find((opt) => opt.id === question.correct_answer)
      if (optionById) return optionById.option_text

      // Fallback: try match by option text (case-insensitive)
      const optionByText = question.question_options.find(
        (opt) => opt.option_text.trim().toLowerCase() === (question.correct_answer || "").trim().toLowerCase(),
      )
      return optionByText ? optionByText.option_text : `Option: ${question.correct_answer}`
    } else if (question.question_type === "true_false") {
      return question.correct_answer === "true" ? "True" : question.correct_answer === "false" ? "False" : "Unknown"
    } else {
      return question.correct_answer || "No correct answer set"
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        {/* Score Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-foreground">{percentage}%</CardTitle>
            <CardDescription className="text-lg text-foreground">{status}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg">
              You scored <span className="font-bold">{score}</span> out of{" "}
              <span className="font-bold">{totalPoints}</span> points
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Completed on {new Date(attempt.completed_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: "Correct", value: attempt.student_answers.filter((a) => a.is_correct).length },
                  {
                    name: "Incorrect",
                    value: attempt.student_answers.length - attempt.student_answers.filter((a) => a.is_correct).length,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Answer Review */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Answer Review</CardTitle>
            <CardDescription>Review your answers and correct responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.student_answers.map((answer) => (
              <div
                key={answer.id}
                className={`rounded-lg border-2 p-4 ${answer.is_correct ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"}`}
              >
                <p className="font-medium text-foreground">{answer.quiz_questions.question_text}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p
                    className={
                      answer.is_correct ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                    }
                  >
                    Your answer: {getAnswerDisplayText(answer)}
                  </p>
                  {!answer.is_correct && (
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Correct answer: {getCorrectAnswerDisplayText(answer)}
                    </p>
                  )}
                  <p
                    className={
                      answer.is_correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }
                  >
                    Points: {answer.points_earned || 0} / {answer.quiz_questions.points || 1}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/student/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href={`/student/quiz/${quizId}`}>Retake Quiz</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
