"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AvailableQuizzes } from "./available-quizzes"
import { PreviousAttempts } from "./previous-attempts"
import { useRouter } from "next/navigation"
import { LogOut, Plus } from "lucide-react"

interface Quiz {
  id: string
  title: string
  description: string
  teacher_id: string
  duration_minutes: number
  is_published: boolean
  created_at: string
  question_count?: number
}

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

export function StudentDashboardContent({ user, profile }: any) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ attempted: 0, completed: 0, averageScore: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadQuizzes()
    loadAttempts()
  }, [])

  const loadQuizzes = async () => {
    try {
      const { data } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          description,
          teacher_id,
          duration_minutes,
          is_published,
          created_at,
          quiz_questions(count)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })

      if (data) {
        const formatted = data.map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          teacher_id: q.teacher_id,
          duration_minutes: q.duration_minutes,
          is_published: q.is_published,
          created_at: q.created_at,
          question_count: q.quiz_questions?.[0]?.count || 0,
        }))
        setQuizzes(formatted)
      }
    } catch (error) {
      console.error("Error loading quizzes:", error)
    }
  }

  const loadAttempts = async () => {
    try {
      const { data } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          quiz_id,
          score,
          total_points,
          status,
          completed_at,
          quizzes(title)
        `)
        .eq("student_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })

      if (data) {
        const formatted = data.map((a: any) => ({
          id: a.id,
          quiz_id: a.quiz_id,
          score: a.score,
          total_points: a.total_points,
          completed_at: a.completed_at,
          quiz: {
            title: a.quizzes?.title || "Unknown Quiz",
          },
        }))
        setAttempts(formatted)

        // Calculate stats
        const avgScore = formatted.length
          ? Math.round(formatted.reduce((sum, a) => sum + (a.score / a.total_points) * 100, 0) / formatted.length)
          : 0

        setStats({
          attempted: formatted.length,
          completed: formatted.filter((a) => a.score !== null).length,
          averageScore: avgScore,
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading attempts:", error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">QuizMaster</h1>
            <p className="text-sm text-muted-foreground">Student Learning Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-foreground">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {profile?.full_name?.split(" ")[0]}!</h2>
          <p className="text-muted-foreground">Continue learning and test your knowledge with available quizzes</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quizzes Attempted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.attempted}</div>
              <p className="text-xs text-muted-foreground">Total completed quizzes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">Across all attempts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Quizzes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzes.length}</div>
              <p className="text-xs text-muted-foreground">Ready to take</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="available">Available Quizzes</TabsTrigger>
              <TabsTrigger value="attempts">My Attempts</TabsTrigger>
            </TabsList>
            <Button onClick={() => router.push("/student/join-quiz")} className="gap-2">
              <Plus className="h-4 w-4" />
              Join Quiz with Code
            </Button>
          </div>

          <TabsContent value="available">
            <AvailableQuizzes quizzes={quizzes} loading={loading} userId={user.id} />
          </TabsContent>

          <TabsContent value="attempts">
            <PreviousAttempts attempts={attempts} loading={loading} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
