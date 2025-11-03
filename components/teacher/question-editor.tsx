"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"

interface QuestionOption {
  id: string
  option_text: string
  order_index: number
}

interface Question {
  id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "short_answer"
  correct_answer: string
  points: number
  order_index: number
  question_options?: QuestionOption[]
}

interface QuestionEditorProps {
  question: Question
  questionNumber: number
  onUpdate: (question: Question) => void
  onDelete: (questionId: string) => void
}

export function QuestionEditor({ question, questionNumber, onUpdate, onDelete }: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(question.question_text === "")
  const [questionType, setQuestionType] = useState(question.question_type)
  const [questionText, setQuestionText] = useState(question.question_text)
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer)
  const [points, setPoints] = useState(question.points.toString())
  const [options, setOptions] = useState(question.question_options || [])

  const handleSave = () => {
    if (questionType === "multiple_choice" && !correctAnswer) {
      alert("Please select a correct answer for this question")
      return
    }
    if (questionType === "true_false" && !correctAnswer) {
      alert("Please select the correct answer (True or False)")
      return
    }
    if (questionType === "short_answer" && !correctAnswer.trim()) {
      alert("Please enter the correct answer")
      return
    }

    onUpdate({
      ...question,
      question_text: questionText,
      question_type: questionType as "multiple_choice" | "true_false" | "short_answer",
      correct_answer: correctAnswer,
      points: Number.parseInt(points),
      question_options: options,
    })
    setIsExpanded(false)
  }

  const handleAddOption = () => {
    const newOption: QuestionOption = {
      id: `opt-${Date.now()}`,
      option_text: "",
      order_index: options.length,
    }
    setOptions([...options, newOption])
  }

  const handleUpdateOption = (index: number, text: string) => {
    const updatedOptions = [...options]
    updatedOptions[index] = {
      ...updatedOptions[index],
      option_text: text,
    }
    setOptions(updatedOptions)
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  if (!isExpanded) {
    return (
      <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(true)}>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                Question {questionNumber}: {questionText || "(No text added)"}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {questionType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {points} pt{Number.parseInt(points) !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(question.id)
              }}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Question {questionNumber}</CardTitle>
            <CardDescription>Edit question details and options</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(question.id)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="space-y-2">
          <Label htmlFor={`question-${question.id}`}>Question Text</Label>
          <Textarea
            id={`question-${question.id}`}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter your question"
            rows={3}
          />
        </div>

        {/* Question Type and Points */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`type-${question.id}`}>Question Type</Label>
            <Select value={questionType} onValueChange={setQuestionType}>
              <SelectTrigger id={`type-${question.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True/False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`points-${question.id}`}>Points</Label>
            <Input
              id={`points-${question.id}`}
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>

        {/* Question Type Specific Rendering */}
        {questionType === "multiple_choice" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Answer Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={option.id} className="flex gap-2">
                    <Input
                      value={option.option_text}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant={correctAnswer === option.id ? "default" : "outline"}
                      onClick={() => setCorrectAnswer(option.id)}
                      className="px-3"
                    >
                      {correctAnswer === option.id ? "✓ Correct" : "Mark Correct"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="h-10 w-10 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={handleAddOption} variant="outline" className="mt-3 w-full bg-transparent">
                + Add Option
              </Button>
            </div>
          </div>
        )}

        {questionType === "true_false" && (
          <div className="space-y-4">
            <Label>Correct Answer</Label>
            <div className="flex gap-2">
              <Button
                variant={correctAnswer === "true" ? "default" : "outline"}
                onClick={() => setCorrectAnswer("true")}
                className="flex-1"
              >
                True
              </Button>
              <Button
                variant={correctAnswer === "false" ? "default" : "outline"}
                onClick={() => setCorrectAnswer("false")}
                className="flex-1"
              >
                False
              </Button>
            </div>
          </div>
        )}

        {questionType === "short_answer" && (
          <div className="space-y-2">
            <Label htmlFor={`answer-${question.id}`}>Correct Answer</Label>
            <Input
              id={`answer-${question.id}`}
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Enter the correct answer"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save Question
          </Button>
          <Button onClick={() => setIsExpanded(false)} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
