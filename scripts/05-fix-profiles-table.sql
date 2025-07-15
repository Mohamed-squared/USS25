-- Migration script to fix profiles table constraints
-- This can be run safely after the initial setup

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Update the profiles table to ensure role column has proper constraints
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student';
ALTER TABLE profiles ALTER COLUMN total_credits SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN total_credits SET DEFAULT 0;

-- Update any existing profiles that might have NULL roles (just in case)
UPDATE profiles SET role = 'student' WHERE role IS NULL;
UPDATE profiles SET total_credits = 0 WHERE total_credits IS NULL;

-- Recreate the improved function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, role, total_credits)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), 
        'student',
        0
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, just return
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
