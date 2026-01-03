'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { getSupabaseClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!config.supabaseEnabled) {
      setIsChecking(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsChecking(false);
      return;
    }

    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Redirect to intended destination or /app
        const redirectTo = searchParams.get('redirect') || '/app';
        router.push(redirectTo);
      } else {
        setIsChecking(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const redirectTo = searchParams.get('redirect') || '/app';
        router.push(redirectTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  const handleAuthChange = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      const redirectTo = searchParams.get('redirect') || '/app';
      router.push(redirectTo);
    }
  };

  // Check for OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const messageParam = searchParams.get('message');
    if (errorParam === 'oauth_callback_failed') {
      console.error('OAuth callback failed. Common causes:');
      console.error('1. Redirect URL in Supabase dashboard must match exactly:');
      console.error('   - Development: http://localhost:3000/auth/callback');
      console.error('   - Production: https://yourdomain.com/auth/callback');
      console.error('2. Make sure Google OAuth is enabled in Supabase dashboard');
      console.error('3. Verify Google OAuth credentials are correct');
    }
  }, [searchParams]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!config.supabaseEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Supabase is not configured.</p>
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm onAuthChange={handleAuthChange} />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}

