-- Add UPDATE policy for quiz_attempts to allow students to update their own attempts
CREATE POLICY "quiz_attempts_update_own" ON public.quiz_attempts FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
