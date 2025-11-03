-- Create users table with role
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')), -- teacher or student
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz options table (for multiple choice)
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_points INTEGER,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student answers table
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for quizzes - Teachers can manage their own, students can view published
CREATE POLICY "quizzes_select_own_or_published" ON public.quizzes FOR SELECT 
  USING (auth.uid() = teacher_id OR is_published = true);
CREATE POLICY "quizzes_insert_own" ON public.quizzes FOR INSERT 
  WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "quizzes_update_own" ON public.quizzes FOR UPDATE 
  USING (auth.uid() = teacher_id);
CREATE POLICY "quizzes_delete_own" ON public.quizzes FOR DELETE 
  USING (auth.uid() = teacher_id);

-- Create RLS policies for quiz_questions - Teachers can manage their own quizzes
CREATE POLICY "quiz_questions_select_own_or_published" ON public.quiz_questions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND (q.teacher_id = auth.uid() OR q.is_published = true)));
CREATE POLICY "quiz_questions_insert_own" ON public.quiz_questions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid()));

-- Create RLS policies for question_options
CREATE POLICY "question_options_select_own_or_published" ON public.question_options FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq 
    INNER JOIN public.quizzes q ON q.id = qq.quiz_id 
    WHERE qq.id = question_id AND (q.teacher_id = auth.uid() OR q.is_published = true)
  ));

-- Create RLS policies for quiz_attempts - Students can see their own, teachers can see all for their quizzes
CREATE POLICY "quiz_attempts_select_own" ON public.quiz_attempts FOR SELECT 
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.teacher_id = auth.uid()));
CREATE POLICY "quiz_attempts_insert_own" ON public.quiz_attempts FOR INSERT 
  WITH CHECK (auth.uid() = student_id);

-- Create RLS policies for student_answers
CREATE POLICY "student_answers_select_own" ON public.student_answers FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts qa 
    WHERE qa.id = attempt_id AND (qa.student_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.quizzes q WHERE q.id = qa.quiz_id AND q.teacher_id = auth.uid()
    ))
  ));
CREATE POLICY "student_answers_insert_own" ON public.student_answers FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = attempt_id AND qa.student_id = auth.uid()
  ));

-- Create trigger function for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
