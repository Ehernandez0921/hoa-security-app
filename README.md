# Gate Security App

A web application for managing gate security in an HOA community.

## Features

- Member registration and management
- Visitor access control
- Security guard verification portal
- Admin dashboard for user management
- Microsoft Outlook/Office 365 authentication

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gate-security-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project at [supabase.com](https://supabase.com)

4. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your Supabase URL and anon key.

5. Set up the database (choose one option):

   **Option 1: Using the Supabase CLI (Recommended for production)**
   ```bash
   # Run the setup script
   npm run setup-db
   ```
   
   **Option 2: Using the SQL Editor in Supabase Dashboard**
   - Navigate to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/20230101000000_initial_schema.sql`
   - Execute the query
   - Run the seed data from `supabase/seed.sql`

6. Set up Microsoft Authentication (Optional):
   - Register a new application in the [Azure Portal](https://portal.azure.com)
   - Go to Azure Active Directory > App registrations > New registration
   - Enter a name for your application
   - Select the appropriate account type (single tenant or multitenant)
   - Set the redirect URI to `http://localhost:3000/api/auth/callback/azure-ad` for development
   - After registration, go to "Certificates & secrets" and create a new client secret
   - Add the client ID, client secret, and tenant ID to your `.env.local` file

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

- `/src/app` - Next.js app routes and pages
- `/src/app/components` - React components
- `/src/app/backend` - Database and API services
- `/src/lib` - Shared utilities and data access layer
- `/supabase` - Supabase migrations and configuration

## Database Schema

### Profiles
- Extends Supabase auth.users
- Contains user roles and status
- Supports MEMBER, SECURITY_GUARD, and SYSTEM_ADMIN roles

### Allowed Visitors
- Managed by members
- Contains access codes for gate entry
- Linked to member profiles

## Authentication

The application supports two authentication methods:
1. **Email/Password** - Using Supabase authentication
2. **Microsoft Outlook/Office 365** - Using Azure AD OAuth

When a user signs in with Microsoft, their profile is automatically created in the database if it doesn't exist already. By default, new Microsoft users are assigned the MEMBER role.

## Security

- Uses Supabase RLS (Row Level Security) for data protection
- Role-based access control
- Secure authentication flow
- OAuth 2.0 integration with Microsoft identity platform

## Development

- The application uses Supabase for all data operations
- All data access goes through the data access layer in `src/lib/dataAccess.ts`

## License

[MIT License](LICENSE)
