"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionEditor } from "./question-editor"
import { Plus, X } from "lucide-react"

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

export function CreateQuizModal({
  onClose,
  onSuccess,
  userId,
}: { onClose: () => void; onSuccess: () => void; userId: string }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("30")
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (questions.length === 0) {
      setError("Please add at least one question before creating the quiz")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title,
          description,
          duration_minutes: Number.parseInt(duration),
          teacher_id: userId,
          is_published: false,
        })
        .select()
        .single()

      if (quizError) throw quizError

      // Insert questions
      for (const question of questions) {
        const { data: newQuestion, error: insertError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: newQuiz.id,
            question_text: question.question_text,
            question_type: question.question_type,
            correct_answer: question.correct_answer,
            points: question.points,
            order_index: question.order_index,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Insert options for multiple choice questions
        if (question.question_type === "multiple_choice" && question.question_options) {
          const optionsToInsert = question.question_options
            .filter((opt) => opt.option_text.trim())
            .map((opt) => ({
              question_id: newQuestion.id,
              option_text: opt.option_text,
              order_index: opt.order_index,
            }))

          if (optionsToInsert.length > 0) {
            const { error: optionsError } = await supabase.from("question_options").insert(optionsToInsert)
            if (optionsError) throw optionsError
          }
        }
      }

      onSuccess()
    } catch (error: unknown) {
      console.log("[v0] Quiz creation error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Create New Quiz</CardTitle>
            <CardDescription>Add quiz details and questions</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Biology Chapter 5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the quiz"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
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
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              {questions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-muted-foreground">No questions added yet</p>
                  <Button onClick={handleAddQuestion} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {questions.map((question, index) => (
                      <QuestionEditor
                        key={question.id}
                        question={question}
                        questionNumber={index + 1}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                      />
                    ))}
                  </div>
                  <Button onClick={handleAddQuestion} variant="outline" className="w-full bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </CardContent>

        <div className="border-t bg-card p-4 flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || questions.length === 0}
            onClick={handleCreate}
            className="flex-1"
          >
            {isLoading ? "Creating..." : "Create Quiz"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
