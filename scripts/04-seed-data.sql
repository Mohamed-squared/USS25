-- Insert sample courses
INSERT INTO courses (id, title, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Linear Algebra', 'Comprehensive study of vector spaces, linear transformations, and matrix theory.'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Real Analysis', 'Rigorous treatment of limits, continuity, differentiation, and integration.'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Number Theory', 'Elementary and analytic number theory, including prime numbers and Diophantine equations.'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Graph Theory', 'Study of graphs, networks, and their applications in computer science and mathematics.'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Machine Learning', 'Introduction to statistical learning, neural networks, and modern AI techniques.');

-- Insert sample schedule entries
INSERT INTO schedule (lecture_date, start_time, end_time, title, description, course_id) VALUES
    (CURRENT_DATE, '09:00:00', '10:30:00', 'Linear Algebra - Lecture 1', 'Introduction to Vector Spaces', '550e8400-e29b-41d4-a716-446655440001'),
    (CURRENT_DATE, '11:00:00', '12:30:00', 'Real Analysis - Lecture 1', 'Limits and Continuity', '550e8400-e29b-41d4-a716-446655440002'),
    (CURRENT_DATE, '14:00:00', '15:30:00', 'Graph Theory - Lecture 1', 'Basic Graph Concepts', '550e8400-e29b-41d4-a716-446655440004'),
    (CURRENT_DATE + INTERVAL '1 day', '09:00:00', '10:30:00', 'Machine Learning - Lecture 1', 'Introduction to ML', '550e8400-e29b-41d4-a716-446655440005'),
    (CURRENT_DATE + INTERVAL '1 day', '11:00:00', '12:30:00', 'Number Theory - Lecture 1', 'Prime Numbers', '550e8400-e29b-41d4-a716-446655440003');
