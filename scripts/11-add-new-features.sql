-- 1. Add an image_url column to the posts table
ALTER TABLE public.posts
ADD COLUMN image_url TEXT;

-- 2. Create the Homework Assignments table
CREATE TABLE public.homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Create the Homework Submissions table
CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.homework_assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  graded_at TIMESTAMPTZ,
  grade SMALLINT,
  feedback TEXT,
  UNIQUE(assignment_id, student_id) -- A student can only submit once per assignment
);

-- Enable RLS
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Create the Attendance Records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID REFERENCES public.schedule(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(lecture_id, student_id) -- One attendance record per student per lecture
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for homework_assignments
CREATE POLICY "homework_assignments_select" ON public.homework_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.course_id = homework_assignments.course_id 
    AND enrollments.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.course_organizers 
    WHERE course_organizers.course_id = homework_assignments.course_id 
    AND course_organizers.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "homework_assignments_insert" ON public.homework_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_organizers 
    WHERE course_organizers.course_id = homework_assignments.course_id 
    AND course_organizers.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "homework_assignments_update" ON public.homework_assignments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.course_organizers 
    WHERE course_organizers.course_id = homework_assignments.course_id 
    AND course_organizers.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "homework_assignments_delete" ON public.homework_assignments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.course_organizers 
    WHERE course_organizers.course_id = homework_assignments.course_id 
    AND course_organizers.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

-- 6. Create RLS policies for homework_submissions
CREATE POLICY "homework_submissions_select" ON public.homework_submissions
FOR SELECT USING (
  student_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.homework_assignments ha
    JOIN public.course_organizers co ON ha.course_id = co.course_id
    WHERE ha.id = homework_submissions.assignment_id
    AND co.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "homework_submissions_insert" ON public.homework_submissions
FOR INSERT WITH CHECK (
  student_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.homework_assignments ha
    JOIN public.enrollments e ON ha.course_id = e.course_id
    WHERE ha.id = homework_submissions.assignment_id
    AND e.user_id = auth.uid()
  )
);

CREATE POLICY "homework_submissions_update" ON public.homework_submissions
FOR UPDATE USING (
  student_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.homework_assignments ha
    JOIN public.course_organizers co ON ha.course_id = co.course_id
    WHERE ha.id = homework_submissions.assignment_id
    AND co.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

-- 7. Create RLS policies for attendance_records
CREATE POLICY "attendance_records_select" ON public.attendance_records
FOR SELECT USING (
  student_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.schedule s
    JOIN public.course_organizers co ON s.course_id = co.course_id
    WHERE s.id = attendance_records.lecture_id
    AND co.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "attendance_records_insert" ON public.attendance_records
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.schedule s
    JOIN public.course_organizers co ON s.course_id = co.course_id
    WHERE s.id = attendance_records.lecture_id
    AND co.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

CREATE POLICY "attendance_records_update" ON public.attendance_records
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.schedule s
    JOIN public.course_organizers co ON s.course_id = co.course_id
    WHERE s.id = attendance_records.lecture_id
    AND co.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'main_organizer'
  )
);

-- 8. Create function to award credits for various actions
CREATE OR REPLACE FUNCTION award_credits(
  user_id UUID,
  amount INTEGER,
  reason TEXT,
  issuer_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.credit_transactions (user_id, amount, reason, issuer_id)
  VALUES (user_id, amount, reason, issuer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to handle post creation credits
CREATE OR REPLACE FUNCTION handle_post_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 2 credits for creating a post
  PERFORM award_credits(NEW.author_id, 2, 'Posted in discussion');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to handle comment creation credits
CREATE OR REPLACE FUNCTION handle_comment_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 1 credit for creating a comment
  PERFORM award_credits(NEW.author_id, 1, 'Commented on a post');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to handle attendance credits
CREATE OR REPLACE FUNCTION handle_attendance_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 5 credits for being marked present
  IF NEW.status = 'present' AND (OLD IS NULL OR OLD.status != 'present') THEN
    PERFORM award_credits(NEW.student_id, 5, 'Attendance marked as present', NEW.organizer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create triggers for automatic credit awards
CREATE TRIGGER post_credits_trigger
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION handle_post_credits();

CREATE TRIGGER comment_credits_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION handle_comment_credits();

CREATE TRIGGER attendance_credits_trigger
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION handle_attendance_credits();

-- 13. Create indexes for better performance
CREATE INDEX idx_homework_assignments_course_id ON public.homework_assignments(course_id);
CREATE INDEX idx_homework_assignments_due_date ON public.homework_assignments(due_date);
CREATE INDEX idx_homework_submissions_assignment_id ON public.homework_submissions(assignment_id);
CREATE INDEX idx_homework_submissions_student_id ON public.homework_submissions(student_id);
CREATE INDEX idx_attendance_records_lecture_id ON public.attendance_records(lecture_id);
CREATE INDEX idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX idx_posts_image_url ON public.posts(image_url) WHERE image_url IS NOT NULL;
