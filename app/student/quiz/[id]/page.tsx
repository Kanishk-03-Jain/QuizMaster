import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuizInterface } from "@/components/student/quiz-interface"

export default async function QuizPage({ 
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

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(`
      id,
      title,
      description,
      duration_minutes,
      is_published,
      quiz_questions (
        id,
        question_text,
        question_type,
        order_index,
        points,
        correct_answer,
        question_options (
          id,
          option_text,
          order_index
        )
      )
    `)
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error) {
    // adjust error handling as needed
    throw new Error(error.message);
  }

  if (!quiz) {
    redirect("/student/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizInterface quiz={quiz} userId={user.id} />
    </div>
  )
}
