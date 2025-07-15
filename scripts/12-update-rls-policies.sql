-- RLS policies for homework_assignments
DROP POLICY IF EXISTS "Organizers can create homework assignments" ON public.homework_assignments;
CREATE POLICY "Organizers can create homework assignments"
ON public.homework_assignments FOR INSERT
TO authenticated WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers WHERE user_id = auth.uid() AND course_id = homework_assignments.course_id)
);

DROP POLICY IF EXISTS "Organizers can update homework assignments" ON public.homework_assignments;
CREATE POLICY "Organizers can update homework assignments"
ON public.homework_assignments FOR UPDATE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers WHERE user_id = auth.uid() AND course_id = homework_assignments.course_id)
);

DROP POLICY IF EXISTS "Organizers can delete homework assignments" ON public.homework_assignments;
CREATE POLICY "Organizers can delete homework assignments"
ON public.homework_assignments FOR DELETE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers WHERE user_id = auth.uid() AND course_id = homework_assignments.course_id)
);

DROP POLICY IF EXISTS "Everyone can read homework assignments" ON public.homework_assignments;
CREATE POLICY "Everyone can read homework assignments"
ON public.homework_assignments FOR SELECT
TO public USING (true);


-- RLS policies for homework_submissions
DROP POLICY IF EXISTS "Students can submit their own homework" ON public.homework_submissions;
CREATE POLICY "Students can submit their own homework"
ON public.homework_submissions FOR INSERT
TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own homework" ON public.homework_submissions;
CREATE POLICY "Students can update their own homework"
ON public.homework_submissions FOR UPDATE
TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Organizers can grade homework submissions" ON public.homework_submissions;
CREATE POLICY "Organizers can grade homework submissions"
ON public.homework_submissions FOR UPDATE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid() AND ha.id = homework_submissions.assignment_id)
) WITH CHECK (true); -- Allow organizers to update grade and feedback fields

DROP POLICY IF EXISTS "Organizers can delete homework submissions" ON public.homework_submissions;
CREATE POLICY "Organizers can delete homework submissions"
ON public.homework_submissions FOR DELETE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid() AND ha.id = homework_submissions.assignment_id)
);

DROP POLICY IF EXISTS "Everyone can read homework submissions" ON public.homework_submissions;
CREATE POLICY "Everyone can read homework submissions"
ON public.homework_submissions FOR SELECT
TO public USING (true);


-- RLS policies for attendance_records
DROP POLICY IF EXISTS "Organizers can create attendance records" ON public.attendance_records;
CREATE POLICY "Organizers can create attendance records"
ON public.attendance_records FOR INSERT
TO authenticated WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.schedule s ON co.course_id = s.course_id WHERE co.user_id = auth.uid() AND s.id = attendance_records.lecture_id)
);

DROP POLICY IF EXISTS "Organizers can update attendance records" ON public.attendance_records;
CREATE POLICY "Organizers can update attendance records"
ON public.attendance_records FOR UPDATE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.schedule s ON co.course_id = s.course_id WHERE co.user_id = auth.uid() AND s.id = attendance_records.lecture_id)
);

DROP POLICY IF EXISTS "Organizers can delete attendance records" ON public.attendance_records;
CREATE POLICY "Organizers can delete attendance records"
ON public.attendance_records FOR DELETE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.schedule s ON co.course_id = s.course_id WHERE co.user_id = auth.uid() AND s.id = attendance_records.lecture_id)
);

DROP POLICY IF EXISTS "Everyone can read attendance records" ON public.attendance_records;
CREATE POLICY "Everyone can read attendance records"
ON public.attendance_records FOR SELECT
TO public USING (true);

-- Update existing policies for `posts` and `comments` to allow organizers to delete
DROP POLICY IF EXISTS "Organizers can delete all posts" ON public.posts;
CREATE POLICY "Organizers can delete all posts"
ON public.posts FOR DELETE
TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
    (EXISTS (SELECT 1 FROM public.course_organizers WHERE user_id = auth.uid() AND course_id = posts.course_id))
);

DROP POLICY IF EXISTS "Organizers can delete all comments" ON public.comments;
CREATE POLICY "Organizers can delete all comments"
ON public.comments FOR DELETE
TO authenticated USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
    (EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.posts p ON co.course_id = p.course_id WHERE co.user_id = auth.uid() AND p.id = comments.post_id))
);

-- Update existing policy for `course_materials` to allow organizers to delete
DROP POLICY IF EXISTS "Organizers can delete course materials" ON public.course_materials;
CREATE POLICY "Organizers can delete course materials"
ON public.course_materials FOR DELETE
TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers WHERE user_id = auth.uid() AND course_id = course_materials.course_id)
);

-- Update `profiles` policy to allow avatar_url update
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
