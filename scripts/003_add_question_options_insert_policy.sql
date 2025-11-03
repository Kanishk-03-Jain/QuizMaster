-- Add missing INSERT policy for question_options table
-- Teachers should be able to insert options for questions in their quizzes
CREATE POLICY "question_options_insert_own" ON public.question_options FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_questions qq 
    INNER JOIN public.quizzes q ON q.id = qq.quiz_id 
    WHERE qq.id = question_id AND q.teacher_id = auth.uid()
  ));

-- Add DELETE policy for question_options table
-- Teachers should be able to delete options from their own quizzes
CREATE POLICY "question_options_delete_own" ON public.question_options FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq 
    INNER JOIN public.quizzes q ON q.id = qq.quiz_id 
    WHERE qq.id = question_id AND q.teacher_id = auth.uid()
  ));

-- Add UPDATE policy for quiz_questions table
-- Teachers should be able to update questions in their own quizzes
CREATE POLICY "quiz_questions_update_own" ON public.quiz_questions FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid()));

-- Add DELETE policy for quiz_questions table
-- Teachers should be able to delete questions from their own quizzes
CREATE POLICY "quiz_questions_delete_own" ON public.quiz_questions FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid()));
