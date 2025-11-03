"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionEditor } from "./question-editor"
import { useRouter } from "next/navigation"
import { ChevronLeft, Copy, Check } from "lucide-react"

interface Question {
  id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "short_answer"
  correct_answer: string
  points: number
  order_index: number
  question_options?: Array<{
    id: string
    option_text: string
    order_index: number
  }>
}

interface Quiz {
  id: string
  title: string
  description: string
  duration_minutes: number
  is_published: boolean
  join_code?: string
  quiz_questions: Question[]
}

export function EditQuizForm({ quiz, userId }: { quiz: Quiz; userId: string }) {
  const [title, setTitle] = useState(quiz.title)
  const [description, setDescription] = useState(quiz.description || "")
  const [duration, setDuration] = useState(quiz.duration_minutes.toString())
  const [questions, setQuestions] = useState<Question[]>(quiz.quiz_questions || [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [joinCode, setJoinCode] = useState(quiz.join_code || "")
  const router = useRouter()
  const supabase = createClient()

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: "",
      question_type: "multiple_choice",
      correct_answer: "",
      points: 1,
      order_index: questions.length,
      question_options: [
        { id: `opt-${Date.now()}-1`, option_text: "", order_index: 0 },
        { id: `opt-${Date.now()}-2`, option_text: "", order_index: 1 },
      ],
    }
    setQuestions([...questions, newQuestion])
  }

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestions(questions.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)))
  }

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId))
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Update quiz metadata
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({
          title,
          description,
          duration_minutes: Number.parseInt(duration),
        })
        .eq("id", quiz.id)
        .eq("teacher_id", userId)

      if (quizError) throw quizError

      // Delete existing questions and options
      const { error: deleteQuestionsError } = await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id)

      if (deleteQuestionsError) throw deleteQuestionsError

      // Insert all questions fresh
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        const { data: newQuestion, error: insertError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            question_type: question.question_type,
            correct_answer: question.correct_answer,
            points: question.points,
            order_index: i,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Insert question options for multiple choice
        if (question.question_type === "multiple_choice" && question.question_options) {
          const optionsToInsert = question.question_options
            .filter((opt) => opt.option_text.trim())
            .map((opt, idx) => ({
              question_id: newQuestion.id,
              option_text: opt.option_text,
              order_index: idx,
            }))

          if (optionsToInsert.length > 0) {
            const { error: optionsError } = await supabase.from("question_options").insert(optionsToInsert)
            if (optionsError) throw optionsError
          }
        }
      }

      setSuccessMessage("Quiz updated successfully!")
      setTimeout(() => router.push("/teacher/dashboard"), 1500)
    } catch (error: unknown) {
      console.log("[v0] Save error:", error)
      setError(error instanceof Error ? error.message : "An error occurred while saving")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (questions.length === 0) {
      setError("Add at least one question before publishing")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let code = joinCode
      if (!code) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        code = ""
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length))
        }
      }

      const { error: publishError } = await supabase
        .from("quizzes")
        .update({
          is_published: true,
          join_code: code,
        })
        .eq("id", quiz.id)
        .eq("teacher_id", userId)

      if (publishError) throw publishError

      setJoinCode(code)
      setSuccessMessage("Quiz published successfully!")
      setTimeout(() => router.push("/teacher/dashboard"), 1500)
    } catch (error: unknown) {
      console.log("[v0] Publish error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const copyJoinCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-lg">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Quiz</h1>
              <p className="text-sm text-muted-foreground">Modify quiz settings and manage questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <Tabs defaultValue="settings" className="max-w-4xl space-y-6">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Details</CardTitle>
                  <CardDescription>Update your quiz information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter quiz title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter quiz description"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="180"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>

                  {quiz.is_published && joinCode && (
                    <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                      <p className="text-sm font-medium text-blue-900">Quiz Join Code</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 font-mono text-lg font-bold text-blue-600">
                          {joinCode}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyJoinCode}
                          className="bg-blue-100 hover:bg-blue-200"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700">Share this code with students so they can join the quiz</p>
                    </div>
                  )}

                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-900">
                      Status: <span className="font-bold">{quiz.is_published ? "Published" : "Draft"}</span>
                    </p>
                    <p className="text-xs text-blue-700">
                      {quiz.is_published
                        ? "This quiz is live and students can take it"
                        : "Add questions and publish to make this quiz available to students"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions" className="space-y-6">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="mb-4 text-muted-foreground">No questions added yet</p>
                      <Button onClick={handleAddQuestion}>Add First Question</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {questions.map((question, index) => (
                      <QuestionEditor
                        key={question.id}
                        question={question}
                        questionNumber={index + 1}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                      />
                    ))}
                    <Button onClick={handleAddQuestion} variant="outline" className="w-full bg-transparent">
                      + Add Question
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Actions */}
        <div className="w-80 border-l border-border bg-card p-6">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-medium">{questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Points:</span>
                  <span className="font-medium">{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{duration} min</span>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="pt-4">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {successMessage && (
              <Card className="border-green-500 bg-green-50">
                <CardContent className="pt-4">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Button onClick={handleSave} disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              {!quiz.is_published && (
                <Button
                  onClick={handlePublish}
                  disabled={isLoading || questions.length === 0}
                  variant="default"
                  className="w-full"
                >
                  Publish Quiz
                </Button>
              )}
              <Button
                onClick={() => router.push("/teacher/dashboard")}
                variant="outline"
                className="w-full bg-transparent"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
