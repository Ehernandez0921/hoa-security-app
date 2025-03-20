import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "./dataAccess";
import { getMicrosoftUserRole, syncMicrosoftUser } from "./msalHelpers";
import { Role } from '@/types/user';

export const authOptions: NextAuthOptions = {
  providers: [
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
      // For Microsoft authentication, ensure the user is properly synced with Supabase
      if (account?.provider === "microsoft" && user.id && user.email) {
        console.log('Microsoft sign in with ID:', user.id);
        
        // Use syncMicrosoftUser which now handles proper UUID conversion
        const supabaseUser = await syncMicrosoftUser({
          id: user.id,
          name: user.name || null,
          email: user.email
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
      
      // Always include the ID from the token
      if (token.sub) {
        session.user.id = token.sub;
      }
      
      // Handle Microsoft user
      if (session.user && token.provider === 'microsoft') {
        try {
          // Ensure Microsoft user exists in our database 
          const microsoftUser = {
            id: token.sub as string,
            name: session.user.name,
            email: session.user.email,
          };
          
          // This function handles UUID conversions and profile creation
          const userProfile = await syncMicrosoftUser(microsoftUser);
          
          if (userProfile) {
            console.log('Profile loaded for Microsoft user:', userProfile.email);
            // Add role and ID to the session
            session.user.role = userProfile.role;
            session.user.id = userProfile.id; // Use the Supabase ID
          } else {
            console.log('Using default role for Microsoft user');
            // Default role if something went wrong
            session.user.role = 'MEMBER';
          }
        } catch (error) {
          console.error('Error in session callback for Microsoft user:', error);
          // Default role if something went wrong
          session.user.role = 'MEMBER';
        }
      } else if (session.user) {
        // For non-Microsoft users, get the role from the token
        if (token.role) {
          session.user.role = token.role as Role;
        } else {
          // Fallback to default role if token doesn't have role
          console.warn('No role found in token, using default MEMBER role');
          session.user.role = 'MEMBER';
        }
        
        // Ensure ID is set for credentials users too
        if (token.id) {
          session.user.id = token.id as string;
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
          role: user.role
        });
        
        // Add user data to token
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      
      return token;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key" // In production, use a proper secret
} 