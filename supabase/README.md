# Supabase Setup

This directory contains all the Supabase-related configuration files and migrations for the Gate Security App.

## Structure

- `migrations/` - Contains SQL migration files that define the database schema
- `config.toml` - Configuration for Supabase CLI
- `seed.sql` - Initial data to seed the database with

## Usage

### Initial Setup

1. Initialize Supabase:
   ```bash
   supabase init
   ```

2. Link to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (You can find your project reference in the URL of your Supabase dashboard)

### Applying Migrations

To apply all migrations to your database:
```bash
supabase db push
```

### Seeding the Database

To seed the database with initial data:
```bash
supabase db reset
```
Note: This will reset your database and apply all migrations and seed data.

## Manual Setup

If you prefer, you can also copy the SQL directly from the migration files and execute them in the Supabase SQL Editor.

## Database Schema

### Profiles Table
- `id` - UUID, primary key, references auth.users
- `name` - TEXT, user's full name
- `role` - TEXT, one of: MEMBER, SECURITY_GUARD, SYSTEM_ADMIN
- `address` - TEXT, user's address
- `status` - TEXT, one of: PENDING, APPROVED, REJECTED
- `created_at` - TIMESTAMPTZ, auto-generated
- `updated_at` - TIMESTAMPTZ, auto-updated

### Allowed Visitors Table
- `id` - UUID, primary key
- `name` - TEXT, visitor's name
- `access_code` - TEXT, 4-digit code
- `member_id` - UUID, references profiles
- `created_at` - TIMESTAMPTZ, auto-generated
- `updated_at` - TIMESTAMPTZ, auto-updated

## Row-Level Security (RLS) Policies

The database includes RLS policies to ensure that:
- Members can only see and modify their own profiles and visitors
- Security guards can view all visitors but not modify them
- System admins can view and modify all data 