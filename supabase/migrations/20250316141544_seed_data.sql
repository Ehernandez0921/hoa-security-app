-- This migration adds seed data for testing purposes
-- It is designed to be idempotent (safe to run multiple times)

-- First, attempt to create a system admin user if they don't exist
DO $$
BEGIN
  -- Check if the user with this email already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com') THEN
    -- Insert the user only if the email doesn't exist
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created admin user with email admin@example.com';
  ELSE
    RAISE NOTICE 'Admin user with email admin@example.com already exists, skipping creation';
  END IF;
END $$;

-- Then create the admin profile (without address field which has been removed)
INSERT INTO public.profiles (id, name, role, email, status, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'System Admin', 'SYSTEM_ADMIN', 'admin@example.com', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a security guard user
DO $$
BEGIN
  -- Check if the user with this email already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'guard@example.com') THEN
    -- Insert the user only if the email doesn't exist
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'guard@example.com', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created guard user with email guard@example.com';
  ELSE
    RAISE NOTICE 'Guard user with email guard@example.com already exists, skipping creation';
  END IF;
END $$;

-- Create the guard profile (without address field which has been removed)
INSERT INTO public.profiles (id, name, role, email, status, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Security Guard', 'SECURITY_GUARD', 'guard@example.com', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create a regular member user
DO $$
BEGIN
  -- Check if the user with this email already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'member@example.com') THEN
    -- Insert the user only if the email doesn't exist
    INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
    VALUES ('22222222-2222-2222-2222-222222222222', 'member@example.com', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created member user with email member@example.com';
  ELSE
    RAISE NOTICE 'Member user with email member@example.com already exists, skipping creation';
  END IF;
END $$;

-- Create the member profile (without address field which has been removed)
INSERT INTO public.profiles (id, name, role, email, status, created_at, updated_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'John Member', 'MEMBER', 'member@example.com', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add member address to the member_addresses table
DO $$
DECLARE
  address_id uuid;
  has_member_id boolean;
BEGIN
  -- Only proceed if member_addresses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_addresses') THEN
    -- Insert address and get the ID
    INSERT INTO public.member_addresses (member_id, address, apartment_number, owner_name, status, is_primary, is_active, created_at, updated_at)
    VALUES 
      ('22222222-2222-2222-2222-222222222222', '123 Main St', NULL, 'John Member', 'APPROVED', true, true, now(), now())
    ON CONFLICT DO NOTHING
    RETURNING id INTO address_id;
    
    -- Only proceed if the address was inserted and returned an ID
    IF address_id IS NOT NULL THEN
      -- Check if allowed_visitors table has member_id column
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'allowed_visitors' AND column_name = 'member_id'
      ) INTO has_member_id;
      
      -- Handle allowed_visitors insertion based on schema
      IF has_member_id THEN
        -- Old schema with member_id
        EXECUTE format('
          INSERT INTO public.allowed_visitors (first_name, last_name, access_code, member_id, address_id, is_active, created_at, updated_at)
          VALUES 
            (%L, %L, %L, %L, %L, %L, now(), now()),
            (%L, %L, %L, %L, %L, %L, now(), now())
          ON CONFLICT DO NOTHING',
          'Bob', 'Wilson', '1234', '22222222-2222-2222-2222-222222222222', address_id, true,
          'Alice', 'Brown', '5678', '22222222-2222-2222-2222-222222222222', address_id, true
        );
        RAISE NOTICE 'Added test visitors with member_id and address_id';
      ELSE
        -- New schema without member_id
        EXECUTE format('
          INSERT INTO public.allowed_visitors (first_name, last_name, access_code, address_id, is_active, created_at, updated_at)
          VALUES 
            (%L, %L, %L, %L, %L, now(), now()),
            (%L, %L, %L, %L, %L, now(), now())
          ON CONFLICT DO NOTHING',
          'Bob', 'Wilson', '1234', address_id, true,
          'Alice', 'Brown', '5678', address_id, true
        );
        RAISE NOTICE 'Added test visitors with address_id only';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'member_addresses table does not exist, skipping address and visitor creation';
  END IF;
END $$;

-- Log completion of migration
DO $$
BEGIN
    RAISE NOTICE 'Seed data migration complete';
END $$; 