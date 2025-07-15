-- Update seed data with proper conflict handling
-- This script can be run safely multiple times

-- Insert or update courses
INSERT INTO courses (id, title, description) VALUES 
(
    gen_random_uuid(),
    'Linear Algebra',
    'Comprehensive study of vector spaces, linear transformations, matrices, and their applications in mathematics and computer science.'
),
(
    gen_random_uuid(),
    'Real Analysis',
    'Rigorous treatment of limits, continuity, differentiation, and integration of real-valued functions.'
),
(
    gen_random_uuid(),
    'Number Theory',
    'Study of integers and integer-valued functions, including prime numbers, divisibility, and modular arithmetic.'
),
(
    gen_random_uuid(),
    'Graph Theory',
    'Mathematical study of graphs and networks, covering connectivity, coloring, matching, and optimization problems.'
),
(
    gen_random_uuid(),
    'Machine Learning',
    'Introduction to algorithms and statistical models that computer systems use to perform tasks without explicit instructions.'
),
(
    gen_random_uuid(),
    'Abstract Algebra',
    'Study of algebraic structures such as groups, rings, and fields, with applications to various areas of mathematics.'
)
ON CONFLICT (title) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- Clear existing schedule and insert new data
DELETE FROM schedule WHERE lecture_date < CURRENT_DATE + INTERVAL '30 days';

-- Insert sample schedule for the next 2 weeks
INSERT INTO schedule (id, lecture_date, start_time, end_time, title, description) VALUES
(gen_random_uuid(), CURRENT_DATE + 1, '09:00:00', '10:30:00', 'Linear Algebra - Introduction to Vector Spaces', 'Basic concepts of vector spaces and linear independence'),
(gen_random_uuid(), CURRENT_DATE + 1, '11:00:00', '12:30:00', 'Real Analysis - Limits and Continuity', 'Fundamental concepts of limits and continuous functions'),
(gen_random_uuid(), CURRENT_DATE + 2, '09:00:00', '10:30:00', 'Number Theory - Prime Numbers', 'Properties and distribution of prime numbers'),
(gen_random_uuid(), CURRENT_DATE + 2, '11:00:00', '12:30:00', 'Graph Theory - Basic Definitions', 'Introduction to graphs, vertices, and edges'),
(gen_random_uuid(), CURRENT_DATE + 3, '09:00:00', '10:30:00', 'Machine Learning - Supervised Learning', 'Classification and regression algorithms'),
(gen_random_uuid(), CURRENT_DATE + 3, '11:00:00', '12:30:00', 'Abstract Algebra - Group Theory', 'Introduction to groups and their properties'),
(gen_random_uuid(), CURRENT_DATE + 4, '09:00:00', '10:30:00', 'Linear Algebra - Matrix Operations', 'Matrix multiplication and determinants'),
(gen_random_uuid(), CURRENT_DATE + 4, '11:00:00', '12:30:00', 'Real Analysis - Differentiation', 'Derivatives and their applications'),
(gen_random_uuid(), CURRENT_DATE + 5, '09:00:00', '10:30:00', 'Number Theory - Modular Arithmetic', 'Congruences and modular arithmetic operations'),
(gen_random_uuid(), CURRENT_DATE + 5, '11:00:00', '12:30:00', 'Graph Theory - Trees and Forests', 'Properties of trees and spanning trees'),
(gen_random_uuid(), CURRENT_DATE + 8, '09:00:00', '10:30:00', 'Machine Learning - Unsupervised Learning', 'Clustering and dimensionality reduction'),
(gen_random_uuid(), CURRENT_DATE + 8, '11:00:00', '12:30:00', 'Abstract Algebra - Ring Theory', 'Introduction to rings and their properties'),
(gen_random_uuid(), CURRENT_DATE + 9, '09:00:00', '10:30:00', 'Linear Algebra - Eigenvalues and Eigenvectors', 'Spectral theory and applications'),
(gen_random_uuid(), CURRENT_DATE + 9, '11:00:00', '12:30:00', 'Real Analysis - Integration', 'Riemann integration and fundamental theorem of calculus'),
(gen_random_uuid(), CURRENT_DATE + 10, '09:00:00', '10:30:00', 'Number Theory - Cryptography Applications', 'RSA and other cryptographic systems'),
(gen_random_uuid(), CURRENT_DATE + 10, '11:00:00', '12:30:00', 'Graph Theory - Network Flows', 'Maximum flow and minimum cut problems');
