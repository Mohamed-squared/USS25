-- Add performance indexes for better query performance
-- This script can be run safely multiple times

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_total_credits ON profiles(total_credits DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);

-- Course organizers indexes
CREATE INDEX IF NOT EXISTS idx_course_organizers_user_id ON course_organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_course_organizers_course_id ON course_organizers(course_id);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_course_id ON posts(course_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_course_created ON posts(course_id, created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC);

-- Course materials indexes
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_uploader_id ON course_materials(uploader_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_type ON course_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_course_materials_created_at ON course_materials(created_at DESC);

-- Credit transactions indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_issuer_id ON credit_transactions(issuer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Schedule indexes
CREATE INDEX IF NOT EXISTS idx_schedule_lecture_date ON schedule(lecture_date);
CREATE INDEX IF NOT EXISTS idx_schedule_start_time ON schedule(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_date_time ON schedule(lecture_date, start_time);
