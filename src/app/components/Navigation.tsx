'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <Link href="/" className="font-bold text-xl">
          Gate Security App
        </Link>
        
        <div className="flex space-x-4">
          {status === 'authenticated' && session ? (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/dashboard')}`}
              >
                Dashboard
              </Link>
              
              {/* Show different links based on user role */}
              {session.user?.role === 'SYSTEM_ADMIN' && (
                <>
                  <Link
                    href="/routes/admin"
                    className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/admin')}`}
                  >
                    Admin
                  </Link>
                  <Link
                    href="/routes/admin/users"
                    className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/admin/users')}`}
                  >
                    Manage Users
                  </Link>
                </>
              )}
              
              {session.user?.role === 'MEMBER' && (
                <Link
                  href="/routes/member/dashboard"
                  className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/member/dashboard')}`}
                >
                  Member Dashboard
                </Link>
              )}
              
              {session.user?.role === 'SECURITY_GUARD' && (
                <Link
                  href="/routes/guard/lookup"
                  className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/guard/lookup')}`}
                >
                  Security
                </Link>
              )}
              
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded hover:bg-blue-700"
              >
                Sign Out
              </button>
            </>
          ) : status === 'unauthenticated' ? (
            <>
              <Link
                href="/routes/login"
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/login')}`}
              >
                Login
              </Link>
              <Link
                href="/routes/register"
                className={`px-3 py-2 rounded hover:bg-blue-700 ${isActive('/routes/register')}`}
              >
                Register
              </Link>
            </>
          ) : (
            // Loading state
            <span className="px-3 py-2">Loading...</span>
          )}
        </div>
      </div>
    </nav>
  );
} 