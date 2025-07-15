-- Create storage buckets and policies
-- This script can be run safely multiple times

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('avatars', 'avatars', true),
    ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Course materials are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete course materials" ON storage.objects;

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Course materials storage policies
CREATE POLICY "Course materials are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-materials');

CREATE POLICY "Enrolled users can upload course materials" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'course-materials' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Organizers can delete course materials" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'course-materials' AND (
            EXISTS (
                SELECT 1 FROM course_organizers 
                WHERE user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'main_organizer'
            )
        )
    );
