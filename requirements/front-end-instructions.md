## Gate Security App: Project Overview

This document outlines the requirements for building a web application a [security-guard] role can check the validity of drivers driving into an HOA community.

## Feature Requirements
- **General data requirements**
    -The application uses Supabase as the primary data source for all operations.
    -All components should use the data access layer in src/lib/dataAccess.ts for database operations.
    -All features should be built with Supabase integration.
    -The application uses Supabase for database operations, authentication, and authorization.

- **Backend Architecture:**
    -Use Supabase Edge Functions for any custom backend logic
    -Use Supabase RLS (Row Level Security) for data access control
    -Use Supabase Auth for authentication and authorization
    -Use Supabase Policies for fine-grained access control
    
- **API Integration Required:**
    -Authentication:
        - Use NextAuth.js for authentication management
        - Primary authentication uses Microsoft Outlook/Office 365 accounts
        - Fallback to email/password authentication via Supabase
        - Implement role-based auth using JWT tokens
    
    -Member Management:
        - Table: members
            - Query with RLS policies for role-based access
            - Real-time updates for member status changes
    
    -Admin Operations:
        - Use RLS policies to restrict admin operations
        - Implement guard role assignment through Supabase functions
        
    -Guard Operations:
        - Implement full-text search on addresses using Supabase text search
        - Real-time updates for visitor list changes

- **Database Schema:**
    profiles (extends Supabase auth.users):
        id: uuid (references auth.users)
        name: text
        role: text (MEMBER, SECURITY_GUARD, SYSTEM_ADMIN)
        address: text
        status: text (PENDING, APPROVED, REJECTED)
        email: text (added to store user email in profile)
        created_at: timestamptz
        updated_at: timestamptz
        
    allowed_visitors:
        id: uuid
        name: text
        access_code: text (4 digits)
        member_id: uuid (references profiles.id)
        created_at: timestamptz
        updated_at: timestamptz
        
    auth_mappings (new):
        id: uuid (primary key)
        microsoft_id: text (Microsoft account identifier)
        supabase_id: uuid (references auth.users.id)
        created_at: timestamptz
        updated_at: timestamptz

## General app architecture:
- Design should use a modern responsive library
- Each different feature should have it's own route
- For Authentication use NextAuth.js with Microsoft provider and Supabase Auth for email/password
- All new components should be placed in the `app/components` folder and named in a consistent format
- All pages should be placed in the `app` folder
- All app route components should be placed in a `app/routes` folder for each page/feature
- All app api components should be placed in a `app/apis` folder for each model
- All app models/interfaces compnents should be placed in a `app/models` folder for each model
- All database and api files should be placed in the `/backend` folder and named in a consistent format
- Authentication and session management files should be placed in the `/lib` folder
- Type definitions should be placed in the `/types` folder
- Database migrations should be placed in the `/supabase/migrations` folder
- Admin utilities and scripts should be placed in the `/scripts` folder

## Authentication:
- Users can log in using two methods:
    1. **Microsoft Authentication**: 
       - Users can sign in with their Microsoft personal accounts (Outlook, Hotmail, Live, etc.)
       - Upon first sign-in, a profile is automatically created with MEMBER role
       - The application must be registered in Azure Portal with correct redirect URI:
         `http://localhost:3000/api/auth/callback/microsoft`
       - Microsoft user data is synced with Supabase profiles for consistent data access
       
    2. **Email/Password Authentication**:
       - Traditional email and password authentication using Supabase
       - Users can register with email, password, name, and address
       - New registrations are assigned MEMBER role with PENDING status
       - Registration information is stored in Supabase profiles table

- **Authentication State Management**:
    - Logged-in users should not be able to access the login page
    - Logged-in users should not be able to access the registration page
    - Attempts to navigate to login/register pages when authenticated should redirect to the dashboard
    - User authentication state should be checked on all protected routes
    - Session management should be handled by NextAuth.js
    - User session includes:
        - User ID
        - User role
        - Authentication provider information
        - Standard user information (name, email)

- **User Profile Management**:
    - All users have a profile page showing their account information
    - Profile data is maintained in Supabase regardless of authentication method
    - Common utilities are available for accessing and updating profile data
    - Authentication method is displayed to the user
    - Profile data is accessible using the session utilities in src/lib/session.ts

## Member Generation:
- [Member] should be able to create an account with the following fields.
    -Name
    -Address
- [Member] should be able to create a list of allowed people that can visit the address at anytime with a 4 number numberical code

## System Administrator:
- [SystemAdmin] should able to assign the role of [Security Guard]
- [SystemAdmin] should be able to validate any new [Member] request and approve the generation of the new [Member] or reject the request to become a new [Member]
- [SystemAdmin] has access to the user management interface at /routes/admin/users to modify user roles and statuses

## Security Guard Validation:
- [Security Guard] should be able to look up the [Member] by address and see the list of allowed people for that address.
    - The adress lookup should be autocomplete and search should not be required to be pressed and should auto show results as parts of the address are typed.
    - When searching the address should show a loading display so user knows that the system is thinking

## Implementation Changes

### Authentication Integration
- Successfully integrated Supabase authentication alongside Microsoft authentication
- User sessions managed through NextAuth.js SessionProvider in ClientLayout.tsx
- Login and registration processes properly manage user profiles in Supabase
- Navigation component updated to use NextAuth's useSession hook for secure UI rendering

### Database Schema Updates
- Added 'email' column to the profiles table to store user email information
- Created 'auth_mappings' table to map Microsoft IDs to Supabase UUIDs
- Created database migration files to systematically apply schema changes
- Set up script for database migrations using Supabase CLI

### User Management
- Implemented secure admin setup endpoint in src/app/api/admin/setup/route.ts
- Created user management interface at /routes/admin/users where admins can:
  - View all users in the system
  - Update user roles (MEMBER, SECURITY_GUARD, SYSTEM_ADMIN)
  - Update user status (PENDING, APPROVED, REJECTED)
- Role-based access control ensures only SYSTEM_ADMIN users can access admin features

### Admin Tools
- Added admin utilities for managing user roles:
  - Created make-admin.js script to promote users to SYSTEM_ADMIN role
  - Added migration files for updating user permissions
  - Implemented proper security checks to prevent unauthorized access

### Authentication Flow
- Microsoft authentication integrated through NextAuth.js
- Supabase email/password authentication as an alternative
- User profiles synchronized between authentication methods
- Session management properly handles role-based access

### Folder Structure Updates
- Implemented new folder structure according to requirements:
  - Moved admin pages to /app/routes/admin/*
  - Moved registration pages to /app/routes/register/*
  - Moved login page to /app/routes/login/*
  - Moved guard functionality to /app/routes/guard/*
  - Created models folder structure in /app/models/*
- Updated navigation components to use new routes
- Added redirects from old paths to new paths during transition
- Created migration plan documents to track changes

## Current File Structure

.
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── requirements
│   └── front-end-instructions.md
├── migration-plan-admin.md
├── migration-plan-guard.md
├── migration-plan-login.md
├── migration-plan-registration.md
├── scripts
│   ├── apply-migrations.js
│   ├── make-admin.js
│   ├── direct-admin.sql
│   └── supabase-setup.sh
├── supabase
│   └── migrations
│       ├── 20230101000000_initial_schema.sql
│       ├── 20230501000001_add_email_to_profiles.sql
│       ├── 20250318010000_make_admin.sql
│       ├── 20250319000100_direct_role_update.sql
│       ├── 20250319000200_update_existing_user.sql
│       └── 20250319000300_create_auth_mappings.sql
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── admin
│   │   │   │   └── setup
│   │   │   │       └── route.ts
│   │   │   └── auth
│   │   │       └── [...nextauth]
│   │   │           └── route.ts
│   │   ├── components
│   │   │   └── Navigation.tsx
│   │   ├── models
│   │   │   ├── auth
│   │   │   │   └── Login.ts
│   │   │   ├── admin
│   │   │   │   └── User.ts
│   │   │   ├── guard
│   │   │   │   └── Address.ts
│   │   │   └── registration
│   │   │       └── Registration.ts
│   │   ├── routes
│   │   │   ├── admin
│   │   │   │   └── users
│   │   │   │       └── page.tsx
│   │   │   ├── guard
│   │   │   │   └── lookup
│   │   │   │       └── page.tsx
│   │   │   ├── login
│   │   │   │   └── page.tsx
│   │   │   └── register
│   │   │       └── page.tsx
│   │   ├── profile
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── Navigation.tsx
│   │   ├── UserProfileInfo.tsx
│   │   └── ... (other components)
│   ├── lib
│   │   ├── auth.ts
│   │   ├── dataAccess.ts
│   │   ├── msalHelpers.ts
│   │   ├── session.ts
│   │   ├── supabase.ts
│   │   └── ... (other utility files)
│   └── types
│       ├── index.ts
│       └── next-auth.d.ts
└── tsconfig.json

## Rules for File Organization

- All new components should be placed in the `app/components` folder and named in a consistent format.
- All pages should be placed in the `app` folder.
- All app route components should be placed in a `app/routes` folder for each page/feature.
- All app api components should be placed in a `app/apis` folder for each model.
- All app models/interfaces components should be placed in a `app/models` folder for each model.
- All database and api files should be placed in the `/backend` folder and named in a consistent format.
- Authentication and session management files should be placed in the `/lib` folder.
- Type definitions should be placed in the `/types` folder.
- Database migrations should be placed in the `/supabase/migrations` folder.
- Admin utilities and scripts should be placed in the `/scripts` folder.