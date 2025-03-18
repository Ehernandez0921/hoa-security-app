-- First, create a system admin user
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@example.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Then create the admin profile
INSERT INTO public.profiles (id, name, role, address, status, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'System Admin', 'SYSTEM_ADMIN', 'Admin Office', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a security guard user
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'guard@example.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create the guard profile
INSERT INTO public.profiles (id, name, role, address, status, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Security Guard', 'SECURITY_GUARD', 'Guard Station', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a regular member user
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'member@example.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create the member profile
INSERT INTO public.profiles (id, name, role, address, status, created_at, updated_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'John Member', 'MEMBER', '123 Main St', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add some allowed visitors for the member
INSERT INTO public.allowed_visitors (name, access_code, member_id, created_at, updated_at)
VALUES 
  ('Bob Wilson', '1234', '22222222-2222-2222-2222-222222222222', now(), now()),
  ('Alice Brown', '5678', '22222222-2222-2222-2222-222222222222', now(), now())
ON CONFLICT DO NOTHING; 