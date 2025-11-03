import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditQuizForm } from "@/components/teacher/edit-quiz-form"

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // unwrap params (fixes: "params is a Promise" error)
  const { id } = await params;

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
      is_published,
      join_code,
      created_at,
      quiz_questions (
        id,
        question_text,
        question_type,
        correct_answer,
        points,
        order_index,
        question_options (
          id,
          option_text,
          order_index
        )
      )
    `)
    .eq("id", id)
    .eq("teacher_id", user.id)
    .order("order_index", { foreignTable: "quiz_questions", ascending: true })
    .single()

  if (!quiz) {
    redirect("/teacher/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <EditQuizForm quiz={quiz} userId={user.id} />
    </div>
  )
}
