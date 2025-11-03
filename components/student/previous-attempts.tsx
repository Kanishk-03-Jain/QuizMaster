"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Attempt {
  id: string
  quiz_id: string
  score: number
  total_points: number
  completed_at: string
  quiz: {
    title: string
  }
}

export function PreviousAttempts({ attempts, loading }: { attempts: Attempt[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (attempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="mb-2 text-lg font-medium text-foreground">No attempts yet</p>
          <p className="text-muted-foreground">Start taking quizzes to see your attempts here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {attempts.map((attempt) => {
        const percentage = Math.round((attempt.score / attempt.total_points) * 100)
        const status =
          percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : percentage >= 40 ? "Fair" : "Needs Improvement"

        return (
          <Card key={attempt.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{attempt.quiz.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(attempt.completed_at).toLocaleDateString()} at{" "}
                    {new Date(attempt.completed_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">{percentage}%</p>
                    <p className="text-sm text-muted-foreground">
                      {attempt.score}/{attempt.total_points}
                    </p>
                  </div>
                  <Badge
                    variant={
                      percentage >= 80
                        ? "default"
                        : percentage >= 60
                          ? "secondary"
                          : percentage >= 40
                            ? "outline"
                            : "destructive"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
