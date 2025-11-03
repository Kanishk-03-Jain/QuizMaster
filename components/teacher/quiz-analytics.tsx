"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import Link from "next/link"
import { ArrowLeft, Users, Target, TrendingUp } from "lucide-react"

interface Quiz {
  id: string
  title: string
  description: string
  duration_minutes: number
  created_at: string
  quiz_questions: Array<{
    id: string
    question_text: string
    correct_answer: string
    points: number
  }>
  quiz_attempts: Array<{
    id: string
    student_id: string
    score: number
    total_points: number
    completed_at: string
    student_answers: Array<{
      id: string
      question_id: string
      is_correct: boolean
      student_answer: string
    }>
  }>
}

export function QuizAnalytics({ quiz }: { quiz: Quiz }) {
  const analytics = useMemo(() => {
    const attempts = quiz.quiz_attempts || []
    const totalAttempts = attempts.length

    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        questionAnalysis: [],
        scoreDistribution: [],
        averageTime: 0,
      }
    }

    const scores = attempts.map((a) => (a.score / a.total_points) * 100)
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const highestScore = Math.max(...scores)
    const lowestScore = Math.min(...scores)
    const passRate = Math.round((scores.filter((s) => s >= 60).length / scores.length) * 100)

    // Score distribution
    const distribution = {
      excellent: scores.filter((s) => s >= 80).length,
      good: scores.filter((s) => s >= 60 && s < 80).length,
      fair: scores.filter((s) => s >= 40 && s < 60).length,
      poor: scores.filter((s) => s < 40).length,
    }

    // Question analysis
    const questionAnalysis = quiz.quiz_questions.map((q) => {
      const answersForQuestion = attempts.flatMap((a) => a.student_answers.filter((sa) => sa.question_id === q.id))

      const correctCount = answersForQuestion.filter((a) => a.is_correct).length
      const correctPercentage = answersForQuestion.length > 0 ? (correctCount / answersForQuestion.length) * 100 : 0

      return {
        id: q.id,
        question: q.question_text.substring(0, 50),
        correctPercentage: Math.round(correctPercentage),
        correctCount,
        totalAnswers: answersForQuestion.length,
        difficulty: correctPercentage >= 80 ? "Easy" : correctPercentage >= 60 ? "Medium" : "Hard",
      }
    })

    const scoreDistributionData = [
      { name: "Excellent (80-100)", value: distribution.excellent, color: "hsl(var(--accent))" },
      { name: "Good (60-79)", value: distribution.good, color: "hsl(var(--primary))" },
      { name: "Fair (40-59)", value: distribution.fair, color: "hsl(var(--secondary))" },
      { name: "Poor (0-39)", value: distribution.poor, color: "hsl(var(--destructive))" },
    ]

    const timeData = attempts.map((a, idx) => ({
      name: `Attempt ${idx + 1}`,
      score: Math.round((a.score / a.total_points) * 100),
    }))

    return {
      totalAttempts,
      averageScore,
      highestScore: Math.round(highestScore),
      lowestScore: Math.round(lowestScore),
      passRate,
      questionAnalysis,
      scoreDistribution: scoreDistributionData,
      timeData,
    }
  }, [quiz])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/teacher/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{quiz.title}</h1>
        <p className="text-muted-foreground">Analytics and performance insights</p>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.averageScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.passRate}%</div>
            <p className="text-xs text-muted-foreground">60% or higher</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="font-bold text-foreground">
                {analytics.highestScore}% - {analytics.lowestScore}%
              </p>
              <p className="text-xs text-muted-foreground">High to Low</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="distribution" className="space-y-6">
        <TabsList>
          <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
          <TabsTrigger value="questions">Question Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Score Distribution */}
        <TabsContent value="distribution">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.scoreDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.scoreDistribution.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.scoreDistribution.map((dist) => (
                  <div key={dist.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dist.name}</span>
                      <span className="text-sm font-bold">{dist.value} students</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(dist.value / analytics.totalAttempts) * 100}%`,
                          backgroundColor: dist.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Question Analysis */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Question Difficulty Analysis</CardTitle>
              <CardDescription>How well students answered each question</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.questionAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" angle={-45} textAnchor="end" height={100} interval={0} />
                  <YAxis label={{ value: "Correct %", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="correctPercentage" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Question Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Detailed Question Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.questionAnalysis.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="font-medium text-foreground">{q.question}</p>
                      <span
                        className={`text-sm font-bold px-2 py-1 rounded ${
                          q.difficulty === "Easy"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : q.difficulty === "Medium"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Correct: {q.correctCount}/{q.totalAnswers}
                        </span>
                        <span className="font-medium">{q.correctPercentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${q.correctPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Score Trends</CardTitle>
              <CardDescription>Performance across all attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
