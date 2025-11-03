-- Add join_code column to quizzes table for students to access quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index on join_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_quizzes_join_code ON public.quizzes(join_code);

-- Create function to generate unique 6-character codes
CREATE OR REPLACE FUNCTION public.generate_quiz_join_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    v_attempt := v_attempt + 1;
    
    IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE join_code = v_code) THEN
      RETURN v_code;
    END IF;
    
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique join code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
