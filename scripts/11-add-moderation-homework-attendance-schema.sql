-- 1. Add an image_url column to the posts table
-- Ensure column addition is idempotent
DO $$ BEGIN
    ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column image_url already exists in public.posts.';
END $$;

-- 2. Create the Homework Assignments table
CREATE TABLE IF NOT EXISTS public.homework_assignments (
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
CREATE TABLE IF NOT EXISTS public.homework_submissions (
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
CREATE TABLE IF NOT EXISTS public.attendance_records (
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

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_homework_assignments_course_id ON public.homework_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_homework_assignments_due_date ON public.homework_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_assignment_id ON public.homework_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON public.homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_lecture_id ON public.attendance_records(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
