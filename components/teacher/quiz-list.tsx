"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Quiz {
  id: string
  title: string
  description: string
  duration_minutes: number
  is_published: boolean
  created_at: string
  question_count?: number
  attempt_count?: number
}

export function QuizList({
  quizzes,
  loading,
  onRefresh,
}: { quizzes: Quiz[]; loading: boolean; onRefresh: () => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">No quizzes yet. Create your first quiz to get started!</p>
          <Button asChild>
            <Link href="/teacher/dashboard">Create Quiz</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {quizzes.map((quiz) => (
        <Card key={quiz.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{quiz.title}</CardTitle>
                  {quiz.is_published ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </div>
                <CardDescription className="mt-1">{quiz.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="ml-2 font-medium text-foreground">{quiz.question_count || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium text-foreground">{quiz.duration_minutes} min</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Attempts:</span>
                  <span className="ml-2 font-medium text-foreground">{quiz.attempt_count || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/teacher/quizzes/${quiz.id}/edit`}>Edit</Link>
                </Button>
                <Button asChild>
                  <Link href={`/teacher/quizzes/${quiz.id}/analyze`}>View Results</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
