import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuizAnalytics } from "@/components/teacher/quiz-analytics"

export default async function QuizAnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select(`
      id,
      title,
      description,
      duration_minutes,
      created_at,
      quiz_questions (
        id,
        question_text,
        correct_answer,
        points
      ),
      quiz_attempts (
        id,
        student_id,
        score,
        total_points,
        completed_at,
        student_answers (
          id,
          question_id,
          is_correct,
          student_answer
        )
      )
    `)
    .eq("id", params.id)
    .eq("teacher_id", user.id)
    .single()

  if (!quiz) {
    redirect("/teacher/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizAnalytics quiz={quiz} />
    </div>
  )
}
