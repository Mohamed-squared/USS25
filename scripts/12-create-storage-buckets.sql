-- Create storage buckets for new features
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('homework-assignments', 'homework-assignments', true),
  ('homework-submissions', 'homework-submissions', true),
  ('post-images', 'post-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for homework-assignments bucket
CREATE POLICY "homework_assignments_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'homework-assignments'
  AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'main_organizer'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.course_organizers 
      WHERE course_organizers.user_id = auth.uid()
    )
  )
);

CREATE POLICY "homework_assignments_select" ON storage.objects
FOR SELECT USING (bucket_id = 'homework-assignments');

-- Create storage policies for homework-submissions bucket
CREATE POLICY "homework_submissions_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'homework-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "homework_submissions_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'homework-submissions'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'main_organizer'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.course_organizers 
      WHERE course_organizers.user_id = auth.uid()
    )
  )
);

-- Create storage policies for post-images bucket
CREATE POLICY "post_images_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "post_images_select" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

-- Create storage policies for avatars bucket
CREATE POLICY "avatars_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_select" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
