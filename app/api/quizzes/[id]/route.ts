import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const quizId = params.id

  try {
    // Get quiz with questions and options
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        duration_minutes,
        is_published,
        join_code,
        teacher_id,
        quiz_questions(
          id,
          question_text,
          question_type,
          correct_answer,
          points,
          order_index,
          question_options(
            id,
            option_text,
            order_index
          )
        )
      `)
      .eq("id", quizId)
      .single()

    if (quizError) throw quizError

    // Check authorization - only teacher can see their quiz
    if (quiz.teacher_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error("[v0] Error fetching quiz:", error)
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 })
  }
}
