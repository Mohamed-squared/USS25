-- Migration script to add missing indexes for better performance
-- This can be run safely after the initial setup

-- Add indexes that might be missing
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_total_credits ON profiles(total_credits DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_issuer_id ON credit_transactions(issuer_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_uploader_id ON course_materials(uploader_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_material_type ON course_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_schedule_course_id ON schedule(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_at ON enrollments(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_course_organizers_assigned_at ON course_organizers(assigned_at);
