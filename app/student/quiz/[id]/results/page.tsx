import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuizResults } from "@/components/student/quiz-results"

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string }
  searchParams: Promise<{ attemptId?: string }> | { attemptId?: string }
}) {
  // unwrap params and searchParams (fixes: "Promise" errors)
  const { id } = await params
  const { attemptId } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !attemptId) {
    redirect("/student/dashboard")
  }

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      score,
      total_points,
      completed_at,
      student_answers (
        id,
        question_id,
        student_answer,
        is_correct,
        points_earned,
        quiz_questions (
          id,
          question_text,
          question_type,
          correct_answer,
          points,
          question_options (
            id,
            option_text
          )
        )
      )
    `)
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single()

  if (!attempt) {
    redirect("/student/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizResults attempt={attempt} quizId={id} />
    </div>
  )
}
