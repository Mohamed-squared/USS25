-- Migration script to fix seed data issues
-- This can be run safely after the initial setup

-- Update existing courses or insert if they don't exist
INSERT INTO courses (id, title, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Linear Algebra', 'Comprehensive study of vector spaces, linear transformations, and matrix theory'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Real Analysis', 'Rigorous treatment of limits, continuity, differentiation, and integration'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Number Theory', 'Elementary and analytic number theory, including prime numbers and Diophantine equations'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Graph Theory', 'Study of graphs, networks, and their applications in computer science and mathematics'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Machine Learning', 'Introduction to statistical learning theory and practical machine learning algorithms')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Clear existing schedule entries and insert fresh ones
DELETE FROM schedule WHERE lecture_date >= CURRENT_DATE - INTERVAL '1 day';

-- Insert sample schedule entries for the next few days
INSERT INTO schedule (lecture_date, start_time, end_time, title, description, course_id) VALUES
    (CURRENT_DATE, '09:00:00', '10:30:00', 'Linear Algebra - Introduction to Vector Spaces', 'Basic concepts and definitions', '550e8400-e29b-41d4-a716-446655440001'),
    (CURRENT_DATE, '11:00:00', '12:30:00', 'Real Analysis - Limits and Continuity', 'Epsilon-delta definitions and theorems', '550e8400-e29b-41d4-a716-446655440002'),
    (CURRENT_DATE, '14:00:00', '15:30:00', 'Number Theory - Prime Numbers', 'Distribution and properties of primes', '550e8400-e29b-41d4-a716-446655440003'),
    (CURRENT_DATE + INTERVAL '1 day', '09:00:00', '10:30:00', 'Graph Theory - Basic Definitions', 'Vertices, edges, and graph representations', '550e8400-e29b-41d4-a716-446655440004'),
    (CURRENT_DATE + INTERVAL '1 day', '11:00:00', '12:30:00', 'Machine Learning - Supervised Learning', 'Classification and regression techniques', '550e8400-e29b-41d4-a716-446655440005'),
    (CURRENT_DATE + INTERVAL '2 days', '09:00:00', '10:30:00', 'Linear Algebra - Matrix Operations', 'Addition, multiplication, and inverses', '550e8400-e29b-41d4-a716-446655440001'),
    (CURRENT_DATE + INTERVAL '2 days', '11:00:00', '12:30:00', 'Real Analysis - Sequences and Series', 'Convergence and divergence tests', '550e8400-e29b-41d4-a716-446655440002'),
    (CURRENT_DATE + INTERVAL '3 days', '09:00:00', '10:30:00', 'Number Theory - Modular Arithmetic', 'Congruences and applications', '550e8400-e29b-41d4-a716-446655440003'),
    (CURRENT_DATE + INTERVAL '3 days', '14:00:00', '15:30:00', 'Graph Theory - Trees and Forests', 'Properties and algorithms', '550e8400-e29b-41d4-a716-446655440004'),
    (CURRENT_DATE + INTERVAL '4 days', '11:00:00', '12:30:00', 'Machine Learning - Neural Networks', 'Backpropagation and deep learning', '550e8400-e29b-41d4-a716-446655440005');
