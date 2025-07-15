-- Migration script to set up Supabase Storage bucket for file uploads
-- This can be run safely after the initial setup

-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for course materials
CREATE POLICY "Anyone can view course materials" ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

CREATE POLICY "Authenticated users can upload course materials" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'course-materials' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own uploads" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'course-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads" ON storage.objects FOR DELETE
USING (
    bucket_id = 'course-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
