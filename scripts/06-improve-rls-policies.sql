-- Improved RLS policies with guest access support
-- This script can be run safely multiple times

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Main organizers can manage courses" ON courses;

DROP POLICY IF EXISTS "Anyone can view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can manage own enrollments" ON enrollments;

DROP POLICY IF EXISTS "Anyone can view course organizers" ON course_organizers;
DROP POLICY IF EXISTS "Main organizers can manage course organizers" ON course_organizers;

DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts or organizers can delete" ON posts;

DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments or organizers can delete" ON comments;

DROP POLICY IF EXISTS "Anyone can view course materials" ON course_materials;
DROP POLICY IF EXISTS "Enrolled users and organizers can upload materials" ON course_materials;
DROP POLICY IF EXISTS "Organizers can delete materials" ON course_materials;

DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Organizers can create credit transactions" ON credit_transactions;

DROP POLICY IF EXISTS "Anyone can view schedule" ON schedule;
DROP POLICY IF EXISTS "Main organizers can manage schedule" ON schedule;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Profiles policies (allow guest viewing)
CREATE POLICY "Anyone can view profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses policies (allow guest viewing)
CREATE POLICY "Anyone can view courses" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Main organizers can manage courses" ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );

-- Enrollments policies (allow guest viewing)
CREATE POLICY "Anyone can view enrollments" ON enrollments
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own enrollments" ON enrollments
    FOR ALL USING (auth.uid() = user_id);

-- Course organizers policies (allow guest viewing)
CREATE POLICY "Anyone can view course organizers" ON course_organizers
    FOR SELECT USING (true);

CREATE POLICY "Main organizers can manage course organizers" ON course_organizers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );

-- Posts policies (allow guest viewing, authenticated participation)
CREATE POLICY "Anyone can view posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts or organizers can delete" ON posts
    FOR DELETE USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN course_organizers co ON p.id = co.user_id
            WHERE p.id = auth.uid() AND co.course_id = posts.course_id
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );

-- Comments policies (allow guest viewing, authenticated participation)
CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments or organizers can delete" ON comments
    FOR DELETE USING (
        auth.uid() = author_id OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN course_organizers co ON p.id = co.user_id
            JOIN posts po ON po.id = comments.post_id
            WHERE p.id = auth.uid() AND co.course_id = po.course_id
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );

-- Course materials policies (allow guest viewing)
CREATE POLICY "Anyone can view course materials" ON course_materials
    FOR SELECT USING (true);

CREATE POLICY "Enrolled users and organizers can upload materials" ON course_materials
    FOR INSERT WITH CHECK (
        auth.uid() = uploader_id AND (
            EXISTS (
                SELECT 1 FROM enrollments 
                WHERE user_id = auth.uid() AND course_id = course_materials.course_id
            ) OR
            EXISTS (
                SELECT 1 FROM course_organizers 
                WHERE user_id = auth.uid() AND course_id = course_materials.course_id
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() AND role = 'main_organizer'
            )
        )
    );

CREATE POLICY "Organizers can delete materials" ON course_materials
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM course_organizers 
            WHERE user_id = auth.uid() AND course_id = course_materials.course_id
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );

-- Credit transactions policies (allow guest viewing of totals)
CREATE POLICY "Anyone can view credit transactions" ON credit_transactions
    FOR SELECT USING (true);

CREATE POLICY "Organizers can create credit transactions" ON credit_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('main_organizer')
        ) OR
        EXISTS (
            SELECT 1 FROM course_organizers 
            WHERE user_id = auth.uid()
        )
    );

-- Schedule policies (allow guest viewing)
CREATE POLICY "Anyone can view schedule" ON schedule
    FOR SELECT USING (true);

CREATE POLICY "Main organizers can manage schedule" ON schedule
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        )
    );
