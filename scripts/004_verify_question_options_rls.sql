-- Verify and update question_options SELECT policy to ensure students can see options from published quizzes
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "question_options_select_own_or_published" ON public.question_options;

-- Create corrected SELECT policy that properly allows students to see options
CREATE POLICY "question_options_select_own_or_published" ON public.question_options FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq 
    INNER JOIN public.quizzes q ON q.id = qq.quiz_id 
    WHERE qq.id = question_id AND (q.teacher_id = auth.uid() OR q.is_published = true)
  ));
