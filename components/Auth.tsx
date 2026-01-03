'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { User } from '@supabase/supabase-js';

interface AuthProps {
  onAuthChange: (user: User | null) => void;
}

export default function Auth({ onAuthChange }: AuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!config.supabaseEnabled) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      onAuthChange(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      onAuthChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [onAuthChange]);

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase is not configured');
      setGoogleLoading(false);
      return;
    }

    try {
      const redirectTo = searchParams.get('redirect') || '/app';
      
      // Store the redirect destination in sessionStorage so it survives the OAuth flow
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_redirect', redirectTo);
      }
      
      // Use a simple redirect URL without query parameters
      // Supabase will add the code parameter when redirecting back
      const callbackUrl = `${window.location.origin}/auth/callback`;
      
      console.log('Initiating Google OAuth with redirect:', callbackUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      // If data.url exists, Supabase will handle the redirect
      // Otherwise, the redirect should happen automatically
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  if (!config.supabaseEnabled) {
    return null;
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">{user.email}</span>
        <button
          onClick={handleSignOut}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google Sign-In Button - Large and Prominent */}
      <button
        type="button"
        data-google-signin
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-base shadow-sm hover:shadow-md"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {googleLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}

