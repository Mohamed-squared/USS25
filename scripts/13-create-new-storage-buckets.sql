-- Create new storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('homework-assignments', 'homework-assignments', TRUE),
  ('homework-submissions', 'homework-submissions', TRUE),
  ('post-images', 'post-images', TRUE),
  ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Policies for homework-assignments bucket
DROP POLICY IF EXISTS "Organizers can upload homework assignments" ON storage.objects;
CREATE POLICY "Organizers can upload homework assignments"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id = 'homework-assignments' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Organizers can download homework assignments" ON storage.objects;
CREATE POLICY "Organizers can download homework assignments"
ON storage.objects FOR SELECT
TO authenticated USING (
  bucket_id = 'homework-assignments' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Organizers can delete homework assignments" ON storage.objects;
CREATE POLICY "Organizers can delete homework assignments"
ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'homework-assignments' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid())
  )
);

-- Policies for homework-submissions bucket
DROP POLICY IF EXISTS "Students can upload their homework submissions" ON storage.objects;
CREATE POLICY "Students can upload their homework submissions"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'homework-submissions' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Students can download their own homework submissions" ON storage.objects;
CREATE POLICY "Students can download their own homework submissions"
ON storage.objects FOR SELECT
TO authenticated USING (bucket_id = 'homework-submissions' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Organizers can download all homework submissions" ON storage.objects;
CREATE POLICY "Organizers can download all homework submissions"
ON storage.objects FOR SELECT
TO authenticated USING (
  bucket_id = 'homework-submissions' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.course_organizers co JOIN public.homework_assignments ha ON co.course_id = ha.course_id WHERE co.user_id = auth.uid())
  )
);

-- Policies for post-images bucket
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'post-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Everyone can read post images" ON storage.objects;
CREATE POLICY "Everyone can read post images"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Organizers can delete post images" ON storage.objects;
CREATE POLICY "Organizers can delete post images"
ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'post-images' AND (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'main_organizer' OR
  EXISTS (SELECT 1 FROM public.posts WHERE id = split_part(name, '/', 2)::uuid AND author_id = auth.uid())
  )
);

-- Policies for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated USING (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Everyone can read avatars" ON storage.objects;
CREATE POLICY "Everyone can read avatars"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'avatars');
