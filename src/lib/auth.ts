import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { authenticateUser } from "./dataAccess";
import { syncOAuthUser } from "./oauthHelpers";
import { Role } from '@/types/user';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    {
      id: "microsoft",
      name: "Microsoft",
      type: "oauth",
      wellKnown: "https://login.microsoftonline.com/consumers/v2.0/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email" } },
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
        };
      },
    },
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Use our data access layer for authentication
          const authResult = await authenticateUser(
            credentials.email,
            credentials.password
          );
          
          if (authResult?.success && authResult.user) {
            return {
              id: authResult.user.id,
              name: authResult.user.name,
              email: authResult.user.email,
              role: authResult.user.role
            };
          }
          
          // Handle specific error types
          if (authResult?.error === 'account_pending') {
            throw new Error('Your account is pending approval by an administrator');
          }
          
          if (authResult?.error === 'account_rejected') {
            throw new Error('Your registration has been rejected');
          }
          
          if (authResult?.error === 'email_not_confirmed') {
            throw new Error('Please check your email and confirm your account before logging in');
          }
          
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          throw error; // Re-throw to allow NextAuth to handle the error
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (Microsoft and Google), ensure the user is properly synced with Supabase
      if ((account?.provider === "microsoft" || account?.provider === "google") && user.id && user.email) {
        console.log(`${account.provider} sign in with ID:`, user.id);
        
        // Use our new syncOAuthUser function that handles both providers
        const supabaseUser = await syncOAuthUser({
          id: user.id,
          name: user.name || '',
          email: user.email,
          provider: account.provider as 'microsoft' | 'google'
        });
        
        // Only allow sign-in if we successfully synced with Supabase
        return !!supabaseUser;
      }
      
      // For credentials provider, we already checked in authorize
      return true;
    },
    async session({ session, user, token }) {
      console.log('Session callback:', { sessionUser: session.user, tokenSub: token.sub });
      
      // Make sure the user object exists on the session
      if (!session.user) {
        session.user = {};
      }
      
      // Handle OAuth users (Microsoft or Google)
      if (session.user && (token.provider === 'microsoft' || token.provider === 'google')) {
        try {
          // Ensure OAuth user exists in our database 
          const oauthUser = {
            id: token.sub as string,
            name: session.user.name || '',
            email: session.user.email || '',
            provider: token.provider as 'microsoft' | 'google'
          };
          
          // This function handles UUID conversions and profile creation
          const userProfile = await syncOAuthUser(oauthUser);
          
          if (userProfile) {
            console.log('Profile loaded for OAuth user:', userProfile.email);
            // Use the Supabase UUID instead of the provider ID
            session.user.id = userProfile.id; // This is the Supabase UUID
            session.user.role = userProfile.role;
          } else {
            console.error('Failed to load user profile');
            // Return an empty session instead of null
            return { expires: session.expires, user: {} };
          }
        } catch (error) {
          console.error('Error in session callback for OAuth user:', error);
          // Return an empty session instead of null
          return { expires: session.expires, user: {} };
        }
      }
      
      // For non-OAuth users, get the role from the token
      if (!session.user.role) {
        if (token.role) {
          session.user.role = token.role as Role;
        } else {
          // Fallback to default role if token doesn't have role
          console.warn('No role found in token, using default MEMBER role');
          session.user.role = 'MEMBER';
        }
      }
      
      // Log the final session user to verify it has all required fields
      console.log('Final session user:', { 
        id: session.user?.id,
        email: session.user?.email,
        role: session.user?.role
      });
      
      return session;
    },
    async jwt({ token, user, account }) {
      // Keep provider info in the token
      if (account) {
        token.provider = account.provider;
      }
      
      // Add user data to the token when signing in
      if (user) {
        console.log('JWT callback user data:', {
          id: user.id,
          email: user.email,
          role: user.role,
          provider: token.provider
        });
        
        // Add user data to token
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        
        // For OAuth providers, ensure we use the provider ID
        if (token.provider === 'microsoft' || token.provider === 'google') {
          token.sub = user.id; // Use the provider's ID as the subject
        }
      }
      
      return token;
    }
  },
  pages: {
    signIn: '/routes/login',
    signOut: '/routes/login'
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key" // In production, use a proper secret
} 