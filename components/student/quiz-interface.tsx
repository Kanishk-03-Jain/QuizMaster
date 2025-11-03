"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Clock } from "lucide-react"

interface Question {
  id: string
  question_text: string
  question_type: string
  order_index: number
  points: number
  correct_answer: string
  question_options: Array<{
    id: string
    option_text: string
    order_index: number
  }>
}

interface Quiz {
  id: string
  title: string
  description: string
  duration_minutes: number
  is_published: boolean
  quiz_questions: Question[]
}

interface Answer {
  [key: string]: string | string[] | null
}

export function QuizInterface({ quiz, userId }: { quiz: Quiz; userId: string }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [timeLeft, setTimeLeft] = useState(quiz.duration_minutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attempted, setAttempted] = useState<{
    [key: string]: boolean
  }>({})
  const router = useRouter()
  const supabase = createClient()

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitQuiz()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const questions = quiz.quiz_questions.sort((a, b) => a.order_index - b.order_index)
  const question = questions[currentQuestion]

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours > 0 ? hours + ":" : ""}${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = useCallback(
    (value: string | string[]) => {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: value,
      }))
      setAttempted((prev) => ({
        ...prev,
        [question.id]: true,
      }))
    },
    [question?.id],
  )

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true)

    try {
      // Create quiz attempt
      const { data: attempt } = await supabase
        .from("quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          student_id: userId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!attempt) throw new Error("Failed to create attempt")

      console.log("[v0] Attempt created:", attempt)

      // Grade quiz and save answers
      let totalScore = 0
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

      console.log("[v0] Total points calculated:", totalPoints)

      for (const q of questions) {
        const studentAnswer = answers[q.id] || ""
        const isCorrect = gradeAnswer(q, studentAnswer)

        console.log("[v0] Question:", q.id, "Answer:", studentAnswer, "Correct:", isCorrect, "Points:", q.points || 1)

        if (isCorrect) {
          totalScore += q.points || 1
        }

        await supabase.from("student_answers").insert({
          attempt_id: attempt.id,
          question_id: q.id,
          student_answer: Array.isArray(studentAnswer) ? studentAnswer.join(",") : studentAnswer,
          is_correct: isCorrect,
          points_earned: isCorrect ? q.points || 1 : 0,
        })
      }

      console.log("[v0] Total score calculated:", totalScore)

      // Update attempt with score
      const { data: updatedAttempt } = await supabase
        .from("quiz_attempts")
        .update({
          score: totalScore,
          total_points: totalPoints,
        })
        .eq("id", attempt.id)
        .select()
        .single()

      console.log("[v0] Attempt updated with score:", updatedAttempt)

      // Navigate to results
      router.push(`/student/quiz/${quiz.id}/results?attemptId=${attempt.id}`)
    } catch (error) {
      console.error("[v0] Error submitting quiz:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const gradeAnswer = (q: Question, answer: string | string[]): boolean => {
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return false

    if (q.question_type === "multiple_choice") {
      return answer === q.correct_answer
    } else if (q.question_type === "true_false") {
      return answer === q.correct_answer
    } else {
      // For short answer, do case-insensitive comparison
      return answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
    }
  }

  const timeWarning = timeLeft < 300 // 5 minutes

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header with Timer */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-2 ${timeWarning ? "bg-destructive/10" : "bg-secondary"}`}
          >
            <Clock className={`h-5 w-5 ${timeWarning ? "text-destructive" : ""}`} />
            <span className={`font-mono text-lg font-bold ${timeWarning ? "text-destructive" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>Question {currentQuestion + 1}</CardTitle>
              <CardDescription>Points: {question?.points || 1}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg font-medium text-foreground">{question?.question_text}</p>

              {/* Answer Options */}
              <div className="space-y-3">
                {question?.question_type === "multiple_choice" && (
                  <>
                    {(!question.question_options || question.question_options.length === 0) && (
                      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                        No options available for this question. Please contact your teacher.
                      </div>
                    )}
                    <RadioGroup value={answers[question.id] || ""} onValueChange={handleAnswerChange}>
                      {question.question_options && question.question_options.length > 0 ? (
                        question.question_options
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((option) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.id} id={option.id} />
                              <Label htmlFor={option.id} className="cursor-pointer">
                                {option.option_text}
                              </Label>
                            </div>
                          ))
                      ) : (
                        <p className="text-muted-foreground">Loading options...</p>
                      )}
                    </RadioGroup>
                  </>
                )}

                {question?.question_type === "true_false" && (
                  <RadioGroup value={answers[question.id] || ""} onValueChange={handleAnswerChange}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true" className="cursor-pointer">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false" className="cursor-pointer">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {question?.question_type === "short_answer" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    rows={5}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Navigation */}
        <aside className="w-64 border-l border-border bg-card p-6 overflow-auto">
          <h3 className="font-semibold text-foreground mb-4">Question Navigation</h3>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                className={`aspect-square rounded-lg font-medium transition-colors ${
                  currentQuestion === idx
                    ? "bg-primary text-primary-foreground"
                    : answers[q.id]
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              variant="outline"
              className="w-full"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === questions.length - 1}
              className="w-full"
            >
              Next
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Quiz"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {Object.keys(attempted).length} out of {questions.length} questions. Are you sure
                  you want to submit?
                </AlertDialogDescription>
                <div className="flex gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitQuiz}>Submit</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </aside>
      </main>
    </div>
  )
}
