# Front-End Authentication Guide

## User Registration Process

### Email/Password Registration
1. Users can register at `/routes/register` with:
   - Name
   - Email
   - Password (minimum 8 characters)
   - Password confirmation

2. After successful registration:
   - User receives a success message
   - Two required steps are clearly outlined:
     1. Email verification
     2. Admin approval
   - User is redirected to the login page with registration success message

### OAuth Registration (Microsoft/Google)
1. Users can register using:
   - Microsoft account
   - Google account
2. OAuth users are automatically verified
3. Their accounts still require admin approval

## Login Process

### Email/Password Login
1. Users can log in at `/routes/login` with:
   - Email
   - Password

2. Login Status Messages:
   - Email not verified:
     - Shows verification required message
     - Provides option to resend verification email
     - Includes instructions to check spam folder
   - Account pending approval:
     - Shows pending approval message
     - Explains admin approval requirement
   - Account rejected:
     - Shows rejection message
   - Invalid credentials:
     - Shows generic error message

### OAuth Login (Microsoft/Google)
1. Microsoft Login:
   - Forces account selector to appear (even if already logged in)
   - Prevents automatic account selection
2. Google Login:
   - Standard Google OAuth flow

### Password Reset
1. Users can request password reset:
   - Click "Forgot your password?"
   - Enter email address
   - System checks if account exists

2. Different flows based on account type:
   - Email/Password users:
     - Receive reset instructions via email
     - Reset link directs to password reset page
   - OAuth users (Microsoft/Google):
     - Shown message to use their provider's login
     - Provided direct link to sign in with their provider

### Email Verification
1. New users receive verification email
2. Verification link in email:
   - Confirms email address
   - Updates account status
3. Resend verification:
   - Available on login page if email not verified
   - Shows success/error messages
   - Includes spam folder check instructions

## Account States

### Pending
- New accounts start in PENDING state
- Requires admin approval
- Users can't log in until approved
- Clear message shown during login attempts

### Email Unverified
- Accounts with unverified email addresses
- Can't log in until verified
- Can request new verification email
- Clear instructions provided

### Approved
- Full access granted
- Can log in normally
- Can use all system features

### Rejected
- Access denied
- Clear message shown during login attempts

## Security Features

1. Password Requirements:
   - Minimum 8 characters
   - Validation on registration form

2. Email Verification:
   - Required for email/password accounts
   - Prevents unauthorized email use

3. Admin Approval:
   - Required for all accounts
   - Adds security layer
   - Prevents unauthorized access

4. OAuth Integration:
   - Secure Microsoft and Google authentication
   - Provider-specific account management
   - Clear user guidance for OAuth accounts

## User Experience

1. Clear Success Messages:
   - Registration confirmation
   - Email verification sent
   - Password reset instructions

2. Error Handling:
   - Validation errors
   - Authentication errors
   - Clear user guidance

3. Status Indicators:
   - Loading states
   - Success/error states
   - Process completion

4. User Guidance:
   - Clear instructions
   - Step-by-step processes
   - Helpful error messages
   - Spam folder check reminders 