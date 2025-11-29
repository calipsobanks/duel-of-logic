-- Reset onboarding_completed for all users
UPDATE profiles
SET onboarding_completed = false;