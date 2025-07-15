-- Add utility functions for common operations
-- This script can be run safely multiple times

-- Function to get user's enrolled courses
CREATE OR REPLACE FUNCTION get_user_courses(user_uuid UUID)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    course_description TEXT,
    is_organizer BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        EXISTS(SELECT 1 FROM course_organizers co WHERE co.user_id = user_uuid AND co.course_id = c.id)
    FROM courses c
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    total_credits INTEGER,
    rank_position BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.display_name,
        p.total_credits,
        ROW_NUMBER() OVER (ORDER BY p.total_credits DESC)
    FROM profiles p
    ORDER BY p.total_credits DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award credits
CREATE OR REPLACE FUNCTION award_credits(
    recipient_id UUID,
    credit_amount INTEGER,
    credit_reason TEXT,
    issuer_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO credit_transactions (user_id, amount, reason, issuer_id)
    VALUES (recipient_id, credit_amount, credit_reason, issuer_id);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get course statistics
CREATE OR REPLACE FUNCTION get_course_stats(course_uuid UUID)
RETURNS TABLE (
    enrolled_count BIGINT,
    post_count BIGINT,
    material_count BIGINT,
    organizer_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = course_uuid),
        (SELECT COUNT(*) FROM posts WHERE course_id = course_uuid),
        (SELECT COUNT(*) FROM course_materials WHERE course_id = course_uuid),
        (SELECT COUNT(*) FROM course_organizers WHERE course_id = course_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's schedule
CREATE OR REPLACE FUNCTION get_todays_schedule()
RETURNS TABLE (
    schedule_id UUID,
    start_time TIME,
    end_time TIME,
    title TEXT,
    description TEXT,
    is_current BOOLEAN,
    is_upcoming BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.start_time,
        s.end_time,
        s.title,
        s.description,
        (CURRENT_TIME BETWEEN s.start_time AND s.end_time) as is_current,
        (CURRENT_TIME < s.start_time AND s.start_time <= CURRENT_TIME + INTERVAL '15 minutes') as is_upcoming
    FROM schedule s
    WHERE s.lecture_date = CURRENT_DATE
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can moderate course
CREATE OR REPLACE FUNCTION can_moderate_course(user_uuid UUID, course_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_uuid AND role = 'main_organizer'
    ) OR EXISTS (
        SELECT 1 FROM course_organizers 
        WHERE user_id = user_uuid AND course_id = course_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
