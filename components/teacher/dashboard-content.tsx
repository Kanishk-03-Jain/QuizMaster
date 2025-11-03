"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuizList } from "./quiz-list"
import { CreateQuizModal } from "./create-quiz-modal"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { useRouter } from "next/navigation"

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

export function TeacherDashboardContent({ user, profile }: any) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadQuizzes()
    loadAnalytics()
  }, [])

  const loadQuizzes = async () => {
    try {
      const { data } = await supabase
        .from("quizzes")
        .select(`
          id,
          title,
          description,
          duration_minutes,
          is_published,
          created_at,
          quiz_questions(count),
          quiz_attempts(count)
        `)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        const formatted = data.map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          duration_minutes: q.duration_minutes,
          is_published: q.is_published,
          created_at: q.created_at,
          question_count: q.quiz_questions?.[0]?.count || 0,
          attempt_count: q.quiz_attempts?.[0]?.count || 0,
        }))
        setQuizzes(formatted)
      }
    } catch (error) {
      console.error("Error loading quizzes:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          score,
          total_points,
          quiz_id,
          quizzes(title)
        `)
        .order("created_at", { ascending: false })
        .limit(10)

      if (attempts) {
        setAnalytics({
          recentAttempts: attempts,
          totalAttempts: attempts.length,
          averageScore: Math.round(
            attempts.reduce((sum, a) => sum + ((a.score || 0) / (a.total_points || 1)) * 100, 0) / attempts.length,
          ),
        })
      }
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleQuizCreated = () => {
    setShowCreateModal(false)
    loadQuizzes()
  }

  return (
    <>
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground">QuizMaster</h1>
            <p className="text-sm text-muted-foreground">Teacher Portal</p>
          </div>
          <nav className="flex-1 space-y-2 px-4">
            <div className="space-y-1">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">MENU</p>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#overview">Overview</a>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#quizzes">My Quizzes</a>
              </Button>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <a href="#analytics">Analytics</a>
              </Button>
            </div>
          </nav>
          <div className="space-y-2 border-t border-border p-4">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-primary"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent">
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Welcome back, {profile?.full_name?.split(" ")[0]}</h2>
              <p className="text-muted-foreground">Manage your quizzes and track student progress</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} size="lg">
              Create New Quiz
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="quizzes">My Quizzes</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{quizzes.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {quizzes.filter((q) => q.is_published).length} published
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Student Attempts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalAttempts || 0}</div>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.averageScore || 0}%</div>
                    <p className="text-xs text-muted-foreground">Across all attempts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Attempt Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={[
                          { name: "Week 1", attempts: 5 },
                          { name: "Week 2", attempts: 8 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="attempts" stroke="hsl(var(--primary))" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Quiz Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={quizzes.slice(0, 5).map((q) => ({ name: q.title, attempts: q.attempt_count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="attempts" fill="hsl(var(--accent))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes">
              <QuizList quizzes={quizzes} loading={loading} onRefresh={loadQuizzes} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Student Attempts</CardTitle>
                  <CardDescription>Last 10 quiz attempts from your students</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.recentAttempts?.length ? (
                    <div className="space-y-4">
                      {analytics.recentAttempts.map((attempt: any) => (
                        <div key={attempt.id} className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <p className="font-medium text-foreground">{attempt.quizzes?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Score: {attempt.score}/{attempt.total_points}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              {Math.round(((attempt.score || 0) / (attempt.total_points || 1)) * 100)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No attempts yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <CreateQuizModal onClose={() => setShowCreateModal(false)} onSuccess={handleQuizCreated} userId={user.id} />
      )}
    </>
  )
}
