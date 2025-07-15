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

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Courses policies
CREATE POLICY "Anyone can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Only main organizers can manage courses" ON courses FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);

-- Enrollments policies
CREATE POLICY "Users can view enrollments" ON enrollments FOR SELECT USING (true);
CREATE POLICY "Users can enroll themselves" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unenroll themselves" ON enrollments FOR DELETE USING (auth.uid() = user_id);

-- Course organizers policies
CREATE POLICY "Anyone can view course organizers" ON course_organizers FOR SELECT USING (true);
CREATE POLICY "Only main organizers can assign course organizers" ON course_organizers FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);

-- Posts policies
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their posts" ON posts FOR UPDATE USING (auth.uid() = author_id);
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
CREATE POLICY "Authors can update their comments" ON comments FOR UPDATE USING (auth.uid() = author_id);
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
    auth.uid() = uploader_id AND (
        material_type = 'student_contribution' AND EXISTS (
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
        )
    )
);

-- Credit transactions policies
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
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
CREATE POLICY "Only main organizers can manage schedule" ON schedule FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'main_organizer'
    )
);
