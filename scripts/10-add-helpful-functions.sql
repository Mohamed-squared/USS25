-- Migration script to add helpful utility functions
-- This can be run safely after the initial setup

-- Function to get user's enrolled courses
CREATE OR REPLACE FUNCTION get_user_courses(user_uuid UUID)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    course_description TEXT,
    enrolled_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.title, c.description, e.enrolled_at
    FROM courses c
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.user_id = user_uuid
    ORDER BY e.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's credit summary
CREATE OR REPLACE FUNCTION get_user_credit_summary(user_uuid UUID)
RETURNS TABLE (
    total_credits INTEGER,
    transactions_count BIGINT,
    last_transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.total_credits,
        COUNT(ct.id),
        MAX(ct.created_at)
    FROM profiles p
    LEFT JOIN credit_transactions ct ON p.id = ct.user_id
    WHERE p.id = user_uuid
    GROUP BY p.total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is organizer for a course
CREATE OR REPLACE FUNCTION is_course_organizer(user_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM course_organizers 
        WHERE user_id = user_uuid AND course_id = course_uuid
    ) OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_uuid AND role = 'main_organizer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's schedule for a user
CREATE OR REPLACE FUNCTION get_user_today_schedule(user_uuid UUID)
RETURNS TABLE (
    schedule_id UUID,
    lecture_date DATE,
    start_time TIME,
    end_time TIME,
    title TEXT,
    description TEXT,
    course_title TEXT,
    is_enrolled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.lecture_date,
        s.start_time,
        s.end_time,
        s.title,
        s.description,
        c.title,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id = user_uuid AND e.course_id = s.course_id)
    FROM schedule s
    JOIN courses c ON s.course_id = c.id
    WHERE s.lecture_date = CURRENT_DATE
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
