# Front-end Development Instructions

## Project Structure
The project uses Next.js 14 with the App Router and follows these key principles:
- Server Components for improved performance
- Client Components where interactivity is needed
- Separation of client and server code

## Key Files and Components

### Session Management
The session management is split into two files to properly handle server and client components:

1. `src/lib/session.ts`
   - Marked with `'use server'` directive
   - Contains server-side async functions:
     - `getSupabaseProfile`: Fetches user profile from Supabase
     - `updateUserProfile`: Updates user profile data
     - `getSession`: Gets the current session with role information
   - Contains shared types:
     - `SessionUser`
     - `CustomSession`

2. `src/lib/sessionClient.ts`
   - Marked with `'use client'` directive
   - Contains client-side utility functions:
     - `hasRole`: Checks if user has specific role
     - `getAuthProvider`: Gets authentication provider info
   - Reuses types from session.ts

### Components
- Client components should import from `sessionClient.ts`
- Server components should import from `session.ts`
- Components that need both should import accordingly from each file

## Best Practices
1. Always mark components with the appropriate directive:
   - Use `'use client'` for components with:
     - Interactivity (useState, useEffect)
     - Browser APIs
     - Event handlers
   - Use `'use server'` for:
     - Data fetching
     - Database operations
     - Server-side operations

2. Keep client and server code separate:
   - Don't mix client and server functions in the same file
   - Use the appropriate imports based on the component type

3. Type Safety:
   - Use proper TypeScript types for all components and functions
   - Share types between client and server code when needed

## Common Issues and Solutions

### Server Component Errors
If you see "Server actions must be async functions" errors:
1. Check if the file is marked with `'use server'`
2. Move client-side functions to a separate client file
3. Import client functions from the client file in client components

### Build Errors
- Dynamic server usage warnings in API routes are normal
- Make sure client components don't import server-only code
- Keep authentication and session handling in server components

## Development Workflow
1. Run development server: `npm run dev`
2. Test builds before deployment: `npm run build`
3. Fix any server/client component issues before deploying
4. Deploy to Vercel when all tests pass

## Deployment
- Vercel will automatically build and deploy your changes
- Make sure all server component issues are resolved before deploying
- Test the production build locally with `npm run build` first

## System Administrator:
- [SystemAdmin] should able to assign the role of [Security Guard]
- [SystemAdmin] should be able to validate any new [Member] request and approve the generation of the new [Member] or reject the request to become a new [Member]
- [SystemAdmin] should be able to approve or reject address submissions from members
- [SystemAdmin] has access to the user management interface at /routes/admin/users to modify user roles and statuses
  - Default view shows PENDING users
  - Can filter users by:
    - Role (ALL, MEMBER, SECURITY_GUARD, SYSTEM_ADMIN)
    - Status (ALL, PENDING, APPROVED, REJECTED)
    - Text search (filters by name or email in real-time)
- [SystemAdmin] has access to the address management interface at /routes/admin/addresses to approve/reject member addresses
  - Default view shows PENDING addresses
  - Can filter addresses by:
    - Status (ALL, PENDING, APPROVED, REJECTED)
    - Text search (filters by address, apartment number, owner name, member name, or member email in real-time)
  - Batch actions available for selected addresses
  - Confirmation modal required for all status changes (approve/reject/revoke):
    - In address list view:
      - Shows address, member name
      - Requires explicit confirmation before proceeding
    - In address detail view:
      - Shows comprehensive information including:
        - Full address
        - Apartment/Unit number (if applicable)
        - Owner name
        - Member name
      - Color-coded action buttons (green for approve, red for reject)
      - Requires explicit confirmation before proceeding
      - Prevents accidental status changes

## Security Guard:
- [SecurityGuard] should be able to log visitor check-ins through the visitor management interface
  - For registered visitors (in allowed_visitors list):
    - Verify visitor against the allowed_visitors list using access code or name
    - Record check-in with associated address and member information
  - For non-registered visitors:
    - Ability to log check-ins by capturing:
      - First name
      - Last name
      - Address being visited
      - Entry method (NAME_VERIFICATION)
      - Optional notes field for additional information
    - All check-ins are recorded in the visitor_check_ins table for audit purposes
    - System maintains a complete log of all entries, regardless of visitor registration status
  - View recent check-in history (last 24 hours)
  - Search and filter check-in records
  - Access to approved addresses for verification purposes 