"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Loader2, Clock, FileText } from "lucide-react"

interface Quiz {
  id: string
  title: string
  description: string
  duration_minutes: number
  question_count?: number
}

export function AvailableQuizzes({ quizzes, loading, userId }: { quizzes: Quiz[]; loading: boolean; userId: string }) {
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
          <p className="mb-2 text-lg font-medium text-foreground">No quizzes available yet</p>
          <p className="text-muted-foreground">Check back soon for new quizzes from your instructors</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => (
        <Card key={quiz.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="line-clamp-2">{quiz.title}</CardTitle>
            <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{quiz.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{quiz.question_count || 0} questions</span>
              </div>
            </div>
            <Button asChild className="w-full mt-auto">
              <Link href={`/student/quiz/${quiz.id}`}>Start Quiz</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
