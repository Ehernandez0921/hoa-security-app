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
        address_id: uuid (references member_addresses.id)
        created_at: timestamptz
        updated_at: timestamptz
        expires_at: timestamptz (new column for visitor expiration)
        first_name: text (for named visitors)
        last_name: text (for named visitors)
        is_active: boolean (tracks if visitor permission is currently active)
        last_used: timestamptz (tracks when the access was last used)
        
    member_addresses:
        id: uuid (primary key)
        member_id: uuid (references profiles.id)
        address: text (full address string)
        apartment_number: text (optional field for apartment/unit numbers)
        owner_name: text (name of property owner)
        status: text (PENDING, APPROVED, REJECTED)
        is_primary: boolean (indicates if this is the member's primary address)
        created_at: timestamptz
        updated_at: timestamptz
        
    auth_mappings:
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
    - Profiles can be identified by either user ID or email address
    - User profile creation is automatic when a matching profile doesn't exist
    - Address information can be updated with confirmation dialog
    - Robust error handling for profile operations with user-friendly messages
    - Update operations have automatic fallback mechanisms to prevent failures
    - Profile data flow ensures consistency across authentication methods
    - Detailed application logging for troubleshooting authentication issues
    - Real-time address autocomplete directly in the address input field
    - Users can start typing their address to see standardized address suggestions
    - Address selection automatically populates the address field with the correct format
    - US address suggestions follow standardized formatting with proper city, state, and zip code

## Member Features
- **Account Creation and Management**:
  - Members can create an account with name and address fields
  - Profile management via the `/routes/profile` page
  - Real-time address autocomplete during registration and profile updates
  - Confirmation dialogues for important profile changes
  - Visual feedback for successful/failed operations

- **Dashboard Access**:
  - Dedicated dashboard at `/routes/member/dashboard`
  - Automatic redirection to dashboard after login
  - Quick access to all member features
  - Overview of active visitor permissions
  - Status notifications for pending actions

- **Address Management**:
  - Members can now manage multiple addresses via `/routes/member/addresses`
  - Each member can have multiple addresses with one marked as primary
  - Primary address is used for profile display and default communication
  - Address management features include:
    - Adding new addresses with real-time validation
    - Editing existing addresses (requires re-approval)
    - Setting a primary address from approved addresses
    - Viewing address approval status (PENDING, APPROVED, REJECTED)
    - Deleting non-primary addresses (if they have no associated visitors)
    - Adding and editing apartment/unit numbers for addresses
  - All address changes require admin approval before becoming active
  - Address approval workflow:
    1. Member adds or edits an address
    2. Address status is set to PENDING
    3. Admin reviews and approves/rejects the address
    4. Member receives visual feedback on address status
  - The AddressList component displays all addresses with status indicators and apartment numbers
  - The AddressForm component enables adding and editing addresses with apartment number support
  - RLS policies ensure members can only view and manage their own addresses
  - Migration from single-address to multi-address system preserves existing data
  - Robust address validation ensures only valid real-world addresses can be saved:
    - Client-side validation via OpenStreetMap API during form entry
    - Server-side validation before saving to database
    - Visual indicators showing address validation status
    - Detailed feedback messages for invalid addresses
    - Address structure verification (requires street number and name)

- **Visitor Management**:
  - Complete visitor management via `/routes/member/visitors`
  - Visitors are now associated with specific member addresses
  - Two visitor entry methods:
    1. **Named Visitors**: Entry with first and last name
    2. **Access Code**: Generate random numeric codes for anonymous visitors
  - Expiration settings with multiple time period options:
    - 24 hours, 1 week, 1 month, or custom date
  - Address selection for each visitor:
    - Only approved addresses can be selected for visitors
    - Visual indicators for pending or rejected addresses
    - Default selection of primary address when available
    - Apartment numbers displayed with addresses for accurate visitor identification
  - Comprehensive visitor list with filtering and sorting:
    - Filter visitors by address to manage multi-property access
    - Filter by status (active/expired)
    - Sort by various criteria (name, creation date, expiration)
  - Bulk operations for managing multiple visitors simultaneously
  - Extension, revocation, and regeneration of access permissions
  - Confirmation dialogs for destructive actions
  - Automatic deactivation of expired permissions
  - Limit controls on total active visitor permissions
  - Audit logging of all visitor access attempts
  - Secure random code generation for visitor access
  - Visual representation of visitor address in the list view

- **Member API Endpoints**:
  - `/api/member/addresses` - Address management endpoints:
    - GET: Retrieve all addresses for the authenticated member
    - POST: Create a new address (initially in PENDING status)
    - PUT: Update address details (resets status to PENDING)
    - DELETE: Remove an address (if not primary and has no visitors)
  - `/api/member/visitors` - CRUD operations for visitor management:
    - GET: Retrieve all visitors for the authenticated member
    - POST: Create a new visitor (named or with access code)
    - PUT: Update visitor details or expiration
    - DELETE: Remove a visitor permission
  - `/api/member/visitors/bulk` - Endpoints for bulk operations:
    - POST: Apply actions to multiple visitors at once
  - `/api/member/visitors/code` - Generate access codes:
    - GET: Generate a unique random access code
    - POST: Verify an access code's validity
  - `/api/member/profile` - Member profile management:
    - GET: Retrieve current member profile
    - PUT: Update profile information
  - `/api/member/dashboard` - Dashboard data:
    - GET: Retrieve aggregated data for member dashboard

- **Admin Address Management**:
  - Admins can approve or reject address submissions via `/routes/admin/addresses`
  - Address approval interface shows:
    - Member details (name, email)
    - Full address information
    - Apartment/unit number if provided
    - Submission date
    - Primary address status
  - Admins can filter addresses by status (PENDING, APPROVED, REJECTED)
  - Each address can be individually approved or rejected
  - Approved addresses are immediately available for visitor management
  - Address approval notifications display to members on their dashboard

- **Member Data Models**:
  - `models/member/Address.ts` - Address data interfaces:
    ```typescript
    interface MemberAddress {
      id: string;
      member_id: string;
      address: string;
      apartment_number?: string;
      owner_name: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      is_primary: boolean;
      created_at: string;
      updated_at: string;
    }
    ```
  - `models/member/Profile.ts` - Member profile interfaces
  - `models/member/Dashboard.ts` - Dashboard data structures
  - `models/member/Visitor.ts` - Visitor data interfaces:
    ```typescript
    interface Visitor {
      id: string;
      member_id: string;
      address_id: string;
      address?: string;
      first_name?: string;
      last_name?: string;
      access_code?: string;
      is_active: boolean;
      expires_at: string;
      last_used?: string;
      created_at: string;
      updated_at: string;
    }
    ```
  - `models/member/VisitorAccess.ts` - Access control interfaces

## System Administrator:
- [SystemAdmin] should able to assign the role of [Security Guard]
- [SystemAdmin] should be able to validate any new [Member] request and approve the generation of the new [Member] or reject the request to become a new [Member]
- [SystemAdmin] should be able to approve or reject address submissions from members
- [SystemAdmin] has access to the user management interface at /routes/admin/users to modify user roles and statuses
- [SystemAdmin] has access to the address management interface at /routes/admin/addresses to approve/reject member addresses

## Security Guard Validation:
- [Security Guard] should be able to look up the [Member] by address and see the list of allowed people for that address.
    - The address lookup should be autocomplete and search should not be required to be pressed and should auto show results as parts of the address are typed.
    - When searching the address should show a loading display so user knows that the system is thinking
    - Address suggestions are provided in real-time as the guard types
    - Improved address lookup uses OpenStreetMap API for accurate and standardized address results
    - Address results are filtered and ranked by quality for relevance
- When viewing a member's address, the guard should see a complete list of all active visitors:
    - Named visitors showing first and last name for identification verification
    - Anonymous visitors with access codes for verification
    - Clear indication of expiration status and expiration dates
    - Visual indicators for expired vs. active visitor permissions
    - Ability to verify access codes entered by visitors
    - Guards can record visitor check-ins with single-click confirmation
    - Apartment/unit numbers are clearly displayed for precise visitor verification
- Guard lookup functionality has been migrated to the new routes structure at `/routes/guard/lookup`
- Navigation components updated to reference new guard routes
- Created dedicated address model in `models/guard/Address.ts` for better type safety
- Implemented type-safe interfaces for guard functionality
- Added redirect from old guard paths to maintain backward compatibility
- Improved loading states for address searches
- Enhanced error handling for address lookups
- Created migration documentation for guard route changes

## Implementation Changes

### Authentication Integration
- Successfully integrated Supabase authentication alongside Microsoft authentication
- User sessions managed through NextAuth.js SessionProvider in ClientLayout.tsx
- Login and registration processes properly manage user profiles in Supabase
- Navigation component updated to use NextAuth's useSession hook for secure UI rendering

### Database Schema Updates
- Added 'email' column to the profiles table to store user email information
- Created 'auth_mappings' table to map Microsoft IDs to Supabase UUIDs
- Created 'member_addresses' table to support multiple addresses per member
- Added 'apartment_number' field to 'member_addresses' table for unit identification
- Modified 'allowed_visitors' table to reference specific addresses via address_id
- Created database migration files to systematically apply schema changes
- Set up script for database migrations using Supabase CLI
- Created database view 'member_visitors_view' to join visitor and address data

### Enhanced Profile Management
- Implemented robust profile identification using both ID and email
- Added fallback mechanisms for user profile creation and retrieval
- Enhanced session handling to ensure proper user identification

### Multi-Address System
- Added support for members to manage multiple property addresses
- Created address approval workflow requiring admin review
- Implemented primary address designation functionality
- Created components for address management:
  - AddressList: Displays all member addresses with status, apartment numbers, and actions
  - AddressForm: Form for adding and editing addresses with apartment number support
- Added API endpoints for address CRUD operations
- Implemented RLS policies to ensure address data security
- Created admin interface for address approval/rejection
- Added address selection to visitor management workflow
- Enhanced visitor list to display associated address information
- Added address filtering to visitor list view

### Address Validation System
- Implemented comprehensive address validation to ensure data quality:
  - Client-side validation using OpenStreetMap API during form entry
  - Real-time feedback with visual indicators (green for valid, yellow for pending validation)
  - Server-side validation to ensure only valid addresses are saved
  - Address structure verification requiring proper format (street number + street name)
  - Protection against false positive validations
  - Clear user feedback messages explaining why addresses are invalid
  - Enhanced address matching algorithms for partial address validation

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
- Added improved NextAuth callbacks to ensure proper user identification
- Enhanced session data with consistent user ID and email handling
- Implemented logging of session details for easier debugging

### Home Page Navigation Improvements
- Enhanced home page to automatically redirect users to appropriate dashboards based on role
- MEMBER users are redirected to member dashboard when logged in
- SECURITY_GUARD users are redirected to guard lookup page
- SYSTEM_ADMIN users are directed to admin dashboard
- Improved session detection for faster navigation
- Added useEffect hooks to detect authentication state changes
- Created smoother user experience with appropriate redirection

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

### Visitor Management Implementation
- Implemented comprehensive visitor management for MEMBER users:
  - Created visitor management interface at `/routes/member/visitors`
  - Added database schema enhancements for visitor tracking with expiration dates
  - Implemented named visitor entry with first and last name fields
  - Created secure random access code generation for anonymous visitors
  - Built expiration date management with flexible time period options
  - Added visitor filtering and sorting capabilities
  - Implemented bulk visitor management operations
  - Created secure access code verification system
  - Added audit logging for visitor access attempts
  - Integrated visitor status with guard lookup functionality
  - Implemented automatic deactivation of expired visitor permissions
  - Added responsive UI with confirmation dialogs for destructive actions

### Responsive Design Updates
- Enhanced visitor management table with improved responsiveness:
  - Implemented adaptive layout that changes based on device screen size
  - Created card-based view for mobile and tablet screens (under 1024px width)
  - Maintained traditional table view for desktop and larger screens (1024px and wider)
  - Ensured action buttons (Edit, Revoke, Delete) are always visible on all screen sizes
  - Optimized button layouts with horizontal arrangement on desktop and side-by-side buttons on mobile/tablet
  - Added high-contrast button colors with white text for better visibility
  - Improved spacing and touch targets for mobile users
  - Enhanced visual separation between visitor cards on smaller screens
  - Used Tailwind's responsive breakpoints (lg:) to control layout switching
  - Implemented consistent typography and visual hierarchy across screen sizes
  - Added vertical spacing between cards for better readability on mobile devices
  - Created separate component rendering functions for improved code organization
  - Ensured consistent component behavior and functionality across all screen sizes
  - Improved accessibility with appropriate button sizing and contrast
  - Added bg-gray-50 backgrounds for better visual distinction in the UI

### Debug and Maintenance Tools
- Added `/api/debug/profile` endpoint to check profile data
- Added `/api/debug/auth` endpoint to test authentication status
- Enhanced error handling throughout the application
- Improved console logging for application state monitoring
- Added tools to diagnose and recover from common authentication issues

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
├── migration-plan-visitors.md
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
│       ├── 20250319000300_create_auth_mappings.sql
│       ├── 20250320000100_visitor_management.sql
│       ├── 20250321000100_member_addresses.sql
│       ├── 20250322000000_remove_visitor_member_id.sql
│       └── 20250323000000_add_apartment_number.sql
├── src
│   ├── app
│   │   ├── api
│   │   │   ├── admin
│   │   │   │   └── setup
│   │   │   │       └── route.ts
│   │   │   ├── address-lookup
│   │   │   │   └── route.ts
│   │   │   ├── member
│   │   │   │   ├── addresses
│   │   │   │   │   └── route.ts
│   │   │   │   ├── dashboard
│   │   │   │   │   └── route.ts
│   │   │   │   ├── profile
│   │   │   │   │   └── route.ts
│   │   │   │   └── visitors
│   │   │   │       ├── bulk
│   │   │   │       │   └── route.ts
│   │   │   │       ├── code
│   │   │   │       │   └── route.ts
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
│   │   │   ├── member
│   │   │   │   ├── Address.ts
│   │   │   │   ├── Dashboard.ts
│   │   │   │   ├── Profile.ts
│   │   │   │   ├── Visitor.ts
│   │   │   │   └── VisitorAccess.ts
│   │   │   └── registration
│   │   │       └── Registration.ts
│   │   ├── routes
│   │   │   ├── admin
│   │   │   │   ├── addresses
│   │   │   │   │   └── page.tsx
│   │   │   │   └── users
│   │   │   │       └── page.tsx
│   │   │   ├── guard
│   │   │   │   └── lookup
│   │   │   │       └── page.tsx
│   │   │   ├── login
│   │   │   │   └── page.tsx
│   │   │   ├── member
│   │   │   │   ├── addresses
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── dashboard
│   │   │   │   │   └── page.tsx
│   │   │   │   └── visitors
│   │   │   │       └── page.tsx
│   │   │   └── register
│   │   │       └── page.tsx
│   │   ├── profile
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── AddressList.tsx
│   │   ├── AddressForm.tsx
│   │   ├── Navigation.tsx
│   │   ├── UserProfileInfo.tsx
│   │   ├── VisitorList.tsx
│   │   ├── VisitorForm.tsx
│   │   ├── CodeGenerator.tsx
│   │   ├── ExpirationDatePicker.tsx
│   │   └── ... (other components)
│   ├── lib
│   │   ├── auth.ts
│   │   ├── dataAccess.ts
│   │   ├── msalHelpers.ts
│   │   ├── session.ts
│   │   ├── supabase.ts
│   │   ├── supabaseAdmin.ts
│   │   ├── visitorAccess.ts
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