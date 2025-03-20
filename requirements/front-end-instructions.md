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
        status: text (PENDING, APPROVED, REJECTED)
        email: text (added to store user email in profile)
        created_at: timestamptz
        updated_at: timestamptz
        
    allowed_visitors:
        id: uuid
        name: text
        access_code: text (4 digits)
        address_id: uuid (references member_addresses.id)
        created_at: timestamptz
        updated_at: timestamptz
        expires_at: timestamptz (new column for visitor expiration)
        first_name: text (for named visitors)
        last_name: text (for named visitors)
        is_active: boolean (tracks if visitor permission is currently active)
        last_used: timestamptz (tracks when the access was last used)
        
    visitor_check_ins:
        id: uuid (primary key)
        visitor_id: uuid (references allowed_visitors.id)
        address_id: uuid (references member_addresses.id)
        checked_in_by: uuid (references profiles.id, the security guard)
        check_in_time: timestamptz (when the check-in occurred)
        entry_method: text (NAME_VERIFICATION or ACCESS_CODE)
        notes: text (optional notes added by security guard)
        created_at: timestamptz
        
    member_addresses:
        id: uuid (primary key)
        member_id: uuid (references profiles.id)
        address: text (full address string)
        apartment_number: text (optional field for apartment/unit numbers)
        owner_name: text (name of property owner)
        status: text (PENDING, APPROVED, REJECTED)
        is_primary: boolean (indicates if this is the member's primary address)
        is_active: boolean (indicates if the address is active or soft-deleted)
        created_at: timestamptz
        updated_at: timestamptz
        
    auth_mappings:
        id: uuid (primary key)
        microsoft_id: text (Microsoft account identifier)
        supabase_id: uuid (references auth.users.id)
        created_at: timestamptz
        updated_at: timestamptz

## Component State Management Best Practices

This section outlines recommended patterns for managing state in React components to prevent infinite update loops and maximize update depth errors.

#### General Best Practices

1. **State Initialization**
   - Initialize state in a single location when possible
   - Use functional initialization for computed initial values
   - Avoid dependencies between state variables during initialization

2. **Managing Dependencies and Updates**
   - Use separate effects for unrelated state updates
   - Include only necessary dependencies in effect dependency arrays
   - Consider using refs to track changes without triggering re-renders
   - Use functional updates (`setState(prev => ...)`) to avoid stale closures

3. **TypeScript Safety**
   - Use proper type assertions for different data shapes
   - Ensure conditional logic handles nullish values properly
   - Create specific types for different form states

4. **Avoiding Circular Dependencies**
   - Break circular relationships between state variables
   - Use refs to track "first render" scenarios
   - Consider combining related state into a single object

#### Troubleshooting Guide

When encountering maximum update depth errors:

1. **Identify the Problem**
   - Look for state updates that trigger effects that update state again
   - Check for conditional rendering that depends on state updated in effects
   - Monitor browser console for repeated re-renders

2. **Solutions**
   - Use refs to track values without triggering re-renders
   - Add guards against unnecessary updates
   - Move state initialization outside of render cycle where possible
   - Consider memoization (useCallback, useMemo) for expensive computations

3. **Testing**
   - Use React DevTools to profile component renders
   - Add temporary console logs to track update cycles
   - Isolate components to test behavior independently

By following these patterns, components with complex state relationships (like VisitorForm and ExpirationDatePicker) can maintain proper functionality without causing infinite render loops.

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
  - Enhanced address validation capabilities:
    - Interactive map preview showing the geolocation of the address
    - Ability to verify address existence against OpenStreetMap or similar service
    - Detailed address components breakdown (street, city, state, zip)
    - Visual indication of address validation status (valid, invalid, uncertain)
    - Address standardization suggestions if the format appears non-standard
    - Verification history tracking for auditing purposes
    - Batch approval options for multiple addresses from the same location/building
    - Option to add admin notes about address verification for future reference
    - Override capability for special cases (new constructions, unusual addresses)
  - Address verification workflow:
    1. Admin reviews pending address in detail view
    2. System shows automatic validation results from OpenStreetMap API
    3. Admin can manually verify/cross-check address using interactive map
    4. Admin can approve, reject, or flag address for further review
    5. Optional verification notes can be added to explain decision

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
- [SystemAdmin] has enhanced address validation capabilities:
  - Viewing detailed address information including apartment/unit numbers
  - Verifying addresses against mapping services and databases
  - Reviewing address validation status from automatic checks
  - Adding verification notes for audit purposes
  - Using interactive maps to visually verify address locations
  - Applying batch operations for address approvals when appropriate
  - Setting verification status flags for addresses (verified, uncertain, invalid)
  - Managing exceptions for special address cases

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
- **Visitor Check-in Logging**:
    - All visitor check-ins must be comprehensively logged in a dedicated `visitor_check_ins` table
    - Each check-in log should record:
        - Visitor ID (from allowed_visitors table)
        - Security Guard ID who performed the check-in
        - Address ID being visited
        - Timestamp of the check-in
        - Entry method used (name verification or access code)
        - Any notes added by the security guard
    - The check-in logs serve as a complete audit trail for community access
    - Check-in history should be retrievable by:
        - Address (all visitors to a specific address)
        - Visitor (all accesses by a specific visitor)
        - Date/time range (all accesses during a specific period)
        - Security Guard (all check-ins performed by a specific guard)
    - Security admins should have access to check-in reports and analytics
    - Visitor check-in history should be available when viewing visitor details
    - The current check-in status should be visible in the visitor list
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

### Admin Address Validation System
- Implemented enhanced address validation tools for administrators:
  - Interactive address detail view for thorough verification
  - Integration with OpenStreetMap for visual address confirmation
  - Address component breakdown showing standardized street, city, state, zip
  - Apartment/unit number clearly highlighted for multi-unit properties
  - Address verification status indicators with color-coding
  - Verification history tracking for each address (who verified, when, changes made)
  - Batch approval interface for processing multiple addresses efficiently
  - Admin notes field for documenting verification decisions
  - Exception handling for special address cases
  - Map-based validation tool showing address pinpoint location
  - Mobile-responsive design for validation on any device
  - Search and filter capabilities to quickly find addresses needing verification
  - Export functionality for address verification reports

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

## Recent Changes and Enhancements

### Security Improvements

1. **Account Status-Based Security**
   - Added strict account status (PENDING/APPROVED) checks to Member features
   - Implemented redirection of PENDING users back to dashboard when attempting to access restricted pages
   - Synchronized UI access with database permissions
   - Prevented unauthorized access to sensitive features (addresses and visitors management)

2. **Dashboard Improvements**
   - Modified dashboard to show/hide management cards based on account status
   - Only APPROVED users can now see Address and Visitor management cards
   - Added direct database query to fetch the current account status from profiles table
   - Display pending message only for users with PENDING status

3. **Visitor Access Handling**
   - Modified `deleteVisitor` function to support soft-deletion
   - Visitors with check-in records are now automatically deactivated (soft-deleted) instead of throwing an error
   - Updated DELETE endpoint to handle the new return format and streamline error handling
   - Removed popup notification for soft-deleted visitors while maintaining initial confirmation dialog
   - Inactive/soft-deleted visitors are now properly hidden from the UI

4. **Address Management Security**
   - Added authorization check in address management page to verify user status
   - Implemented loading states during authorization checks
   - Added custom confirmation dialog for address deletion
   - Improved feedback for address management actions

5. **Authentication Flow Enhancement**
   - Fixed email field handling in registration process
   - Enhanced login error messaging for better user experience
   - Corrected registration redirection paths
   - Added clearer feedback for pending and rejected accounts
   - Updated authentication logic to handle pending approval and rejected statuses
   - Added automatic email confirmation for new users using admin privileges
   - Improved error handling for various authentication edge cases (unconfirmed emails, rejected accounts)
   - Fixed NextAuth session handling to properly store and retrieve user roles
   - Added admin tools to help with email confirmation issues

6. **Session Management Enhancement**
   - Improved JWT callback to properly store user information in token
   - Enhanced session callback to handle role resolution from token
   - Fixed "Cannot read properties of undefined (reading 'role')" error in session
   - Added robust error handling for session creation and retrieval
   - Improved logging for authentication and session debugging

7. **Email Verification Workflow**
   - Added support for email confirmation process with Supabase
   - Implemented automatic email confirmation during registration when possible
   - Added clear error messages for unconfirmed email accounts
   - Created admin tools to manually confirm user emails when needed
   - Enhanced registration success message to explain the verification process

### Code Quality Improvements

1. **Error Handling**
   - Standardized error messaging across the application
   - Improved user feedback for failed operations
   - Enhanced logging for debugging and tracking issues
   - Added detailed console logging for authentication and session processes
   - Implemented try-catch blocks with specific error types for better error identification

2. **State Management**
   - Added proper loading states during asynchronous operations
   - Implemented structured state for complex UI interactions
   - Fixed linter errors and type issues in components
   - Enhanced state handling for authorization checks
   - Added auth loading states to prevent UI flicker during status checks

3. **Consistent UI Experience**
   - Standardized confirmation dialogs across the application
   - Improved loading indicators for better user experience
   - Enhanced visibility of account status information
   - Added clear status indicators in the dashboard for pending accounts
   - Implemented conditional rendering of UI elements based on account status

### Security Design Principles Implemented

1. **Least Privilege Access**
   - Users can only access features appropriate to their account status
   - PENDING users are restricted to viewing basic profile information
   - Role-based permissions enforced both in UI and database layer
   - Added explicit status checks before allowing access to sensitive features

2. **Defense in Depth**
   - Added multiple layers of security checks (session verification, status checks, database policies)
   - Client-side restrictions backed by server-side validation
   - Implemented both UI-level and API-level authorization controls
   - Added database-level verification of user status

3. **User Experience Security**
   - Clear status information to help users understand their account limitations
   - Intuitive navigation that prevents access to unauthorized features
   - Helpful error messages that guide users without revealing sensitive details
   - Improved feedback for email verification and account approval process
   - Enhanced login error messaging with actionable next steps

### Admin Enhancements

1. **User Management Tools**
   - Added "Confirm Email" functionality to the admin user management interface
   - Enhanced user listing with status highlighting (pending users have yellow background)
   - Improved user management workflow for handling unconfirmed emails
   - Added more detailed status information for better admin decision-making

2. **Authentication Debugging**
   - Added detailed authentication logging for troubleshooting
   - Enhanced error handling in auth callbacks
   - Improved feedback for authentication-related issues
   - Added tools to identify and resolve common authentication problems

### Registration and Login Flow Improvements

1. **Enhanced Registration Process**
   - Removed address field from registration process
   - Simplified registration form focusing on essential user information
   - Added guidance about managing addresses through the dedicated Address Management page
   - Clarified the two-step process (email verification + admin approval)
   - Added better success messaging after registration
   - Improved redirection paths after registration completion
   - Fixed email field storage in profiles table

2. **Profile Management Changes**
   - Removed address management from the profile page
   - Added link to dedicated Address Management section
   - Improved profile UI with clearer account status indicators
   - Enhanced profile data display with better organization

3. **Multiple Addresses Support**
   - Completely removed address field from profiles table in the database
   - Address management now exclusively through dedicated member_addresses table
   - Updated all code to work with the new schema
   - Registration process simplified to no longer request address
   - Added is_active flag to member_addresses for soft deletion support
   - Enhanced profile management to direct users to Address Management section
   - All database operations updated to work with the new model
   - Migration created to cleanly remove the address column
   - Seed data updated to align with new schema

4. **Database Schema Improvements**
   - Streamlined database design with clearer entity relationships
   - Removed redundant address storage from multiple places
   - Better alignment with multi-address support requirements
   - Simplified profile table with removal of unnecessary fields
   - Enhanced normalization for better data management

5. **User Interface Updates**
   - Registration form simplified with address field removed
   - Profile display improved to focus on core user information
   - Clear guidance for users on where to manage addresses
   - Added explanatory text about multi-address management
   - Enhanced user flow for address management

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

## Admin API Endpoints
- `/api/admin/users` - User management endpoints:
  - GET: Retrieve all users with filtering options
  - PUT: Update user roles and status
- `/api/admin/addresses` - Address management and validation:
  - GET: Retrieve all addresses with filtering by status, member, date
  - PUT: Update address approval status with verification details
  - POST: Add verification notes or override validation
- `/api/admin/addresses/batch` - Batch address operations:
  - POST: Apply approval/rejection to multiple addresses
- `/api/admin/addresses/verify` - Address verification tools:
  - GET: Get detailed validation information for an address
  - POST: Request enhanced validation from mapping service
- `/api/admin/addresses/map` - Map integration:
  - GET: Retrieve map coordinates and visualization data for address