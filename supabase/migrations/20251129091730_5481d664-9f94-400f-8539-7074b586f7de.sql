-- Reset onboarding completion for all users
UPDATE profiles 
SET onboarding_completed = false 
WHERE onboarding_completed = true;