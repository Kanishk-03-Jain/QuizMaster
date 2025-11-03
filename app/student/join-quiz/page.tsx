"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft } from "lucide-react"

export default function JoinQuizPage() {
  const [joinCode, setJoinCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Find quiz by join code
      const { data: quiz, error: findError } = await supabase
        .from("quizzes")
        .select("id")
        .eq("join_code", joinCode.toUpperCase())
        .eq("is_published", true)
        .single()

      if (findError) throw new Error("Quiz not found. Please check the join code and try again.")

      // Redirect to quiz
      router.push(`/student/quiz/${quiz.id}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-4 p-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Join Quiz</h1>
            <p className="text-sm text-muted-foreground">Enter the quiz code to get started</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter Quiz Code</CardTitle>
            <CardDescription>Ask your instructor for the 6-character quiz code</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Quiz Code</Label>
                <Input
                  id="joinCode"
                  placeholder="e.g., ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg font-bold tracking-widest"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isLoading || joinCode.length !== 6} className="w-full">
                {isLoading ? "Joining..." : "Join Quiz"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
