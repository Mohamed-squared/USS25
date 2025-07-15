-- Migration script to improve Row Level Security policies
-- This can be run safely after the initial setup

-- Drop existing policies to recreate them with improvements
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Only main organizers can manage courses" ON courses;
DROP POLICY IF EXISTS "Main organizers can manage courses" ON courses;
DROP POLICY IF EXISTS "Users can view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can enroll themselves" ON enrollments;
DROP POLICY IF EXISTS "Users can unenroll themselves" ON enrollments;
DROP POLICY IF EXISTS "Organizers can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Anyone can view course organizers" ON course_organizers;
DROP POLICY IF EXISTS "Only main organizers can assign course organizers" ON course_organizers;
DROP POLICY IF EXISTS "Main organizers can assign course organizers" ON course_organizers;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Authors can update their posts" ON posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON posts;
DROP POLICY IF EXISTS "Authors and organizers can delete posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Authors can update their comments" ON comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON comments;
DROP POLICY IF EXISTS "Authors and organizers can delete comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view course materials" ON course_materials;
DROP POLICY IF EXISTS "Enrolled users can upload student contributions" ON course_materials;
DROP POLICY IF EXISTS "Uploaders and organizers can delete materials" ON course_materials;
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Organizers can view all credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Organizers can create credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Anyone can view schedule" ON schedule;
DROP POLICY IF EXISTS "Only main organizers can manage schedule" ON schedule;
DROP POLICY IF EXISTS "Main organizers can manage schedule" ON schedule;

-- Recreate improved policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses policies
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Main organizers can manage courses" ON courses FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);

-- Enrollments policies
CREATE POLICY "Users can view enrollments" ON enrollments FOR SELECT USING (true);
CREATE POLICY "Users can enroll themselves" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unenroll themselves" ON enrollments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Organizers can manage enrollments" ON enrollments FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);

-- Course organizers policies
CREATE POLICY "Anyone can view course organizers" ON course_organizers FOR SELECT USING (true);
CREATE POLICY "Main organizers can assign course organizers" ON course_organizers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);

-- Posts policies
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and organizers can delete posts" ON posts FOR DELETE USING (
    auth.uid() = author_id OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    ) OR
    (course_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM course_organizers 
        WHERE user_id = auth.uid() AND course_id = posts.course_id
    ))
);

-- Comments policies
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own comments" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and organizers can delete comments" ON comments FOR DELETE USING (
    auth.uid() = author_id OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    ) OR
    EXISTS (
        SELECT 1 FROM course_organizers co
        JOIN posts p ON p.id = comments.post_id
        WHERE co.user_id = auth.uid() AND co.course_id = p.course_id
    )
);

-- Course materials policies
CREATE POLICY "Anyone can view course materials" ON course_materials FOR SELECT USING (true);
CREATE POLICY "Enrolled users can upload student contributions" ON course_materials FOR INSERT WITH CHECK (
    auth.uid() = uploader_id AND
    (material_type = 'student_contribution' AND EXISTS (
        SELECT 1 FROM enrollments 
        WHERE user_id = auth.uid() AND course_id = course_materials.course_id
    ) OR
    material_type IN ('organizer_note', 'recorded_lecture') AND (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'main_organizer'
        ) OR
        EXISTS (
            SELECT 1 FROM course_organizers 
            WHERE user_id = auth.uid() AND course_id = course_materials.course_id
        )
    ))
);
CREATE POLICY "Uploaders and organizers can delete materials" ON course_materials FOR DELETE USING (
    auth.uid() = uploader_id OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    ) OR
    EXISTS (
        SELECT 1 FROM course_organizers 
        WHERE user_id = auth.uid() AND course_id = course_materials.course_id
    )
);

-- Credit transactions policies
CREATE POLICY "Users can view own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Organizers can view all credit transactions" ON credit_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);
CREATE POLICY "Organizers can create credit transactions" ON credit_transactions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    ) OR
    EXISTS (
        SELECT 1 FROM course_organizers 
        WHERE user_id = auth.uid()
    )
);

-- Schedule policies
CREATE POLICY "Anyone can view schedule" ON schedule FOR SELECT USING (true);
CREATE POLICY "Main organizers can manage schedule" ON schedule FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);
