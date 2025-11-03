import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const quizId = params.id

  try {
    // Get current quiz
    const { data: quiz, error: getError } = await supabase
      .from("quizzes")
      .select("id, teacher_id, is_published, join_code")
      .eq("id", quizId)
      .single()

    if (getError) throw getError

    // Check authorization
    if (quiz.teacher_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate join code if not already set
    let joinCode = quiz.join_code
    if (!joinCode) {
      // Generate unique 6-character code
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let code = ""
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      // Check for uniqueness
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabase.from("quizzes").select("id").eq("join_code", code).single()

        if (!existing) {
          joinCode = code
          break
        }

        code = ""
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length))
        }
        attempts++
      }
    }

    // Update quiz to published with join code
    const { data: updated, error: updateError } = await supabase
      .from("quizzes")
      .update({
        is_published: true,
        join_code: joinCode,
      })
      .eq("id", quizId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[v0] Error publishing quiz:", error)
    return NextResponse.json({ error: "Failed to publish quiz" }, { status: 500 })
  }
}
