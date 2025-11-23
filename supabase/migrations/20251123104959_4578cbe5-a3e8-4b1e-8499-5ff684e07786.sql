-- Create demo users Jeezy and Gucci Mane
-- Note: These will have basic auth setup. Passwords can be reset via Supabase dashboard if needed.

-- Insert Jeezy
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jeezy@demo.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"username": "Jeezy"}'::jsonb,
  now(),
  now(),
  '',
  ''
);

-- Insert Gucci Mane
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'guccimane@demo.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"username": "Gucci Mane"}'::jsonb,
  now(),
  now(),
  '',
  ''
);