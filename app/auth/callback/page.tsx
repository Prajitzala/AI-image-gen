'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    if (!config.supabaseEnabled) {
      setError('Supabase is not configured');
      setIsProcessing(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase client not available');
      setIsProcessing(false);
      return;
    }

    // Check for error in URL
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam) {
      console.error('OAuth error:', errorParam, errorDescription);
      setError(errorDescription || errorParam);
      setIsProcessing(false);
      setTimeout(() => {
        router.push('/sign-in?error=' + encodeURIComponent(errorDescription || errorParam));
      }, 2000);
      return;
    }

    // Check for code in URL
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/app';

    if (code) {
      // Exchange code for session
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error: exchangeError }) => {
          if (exchangeError) {
            console.error('Error exchanging code:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => {
              router.push('/sign-in?error=' + encodeURIComponent(exchangeError.message));
            }, 2000);
            return;
          }

          if (data.session) {
            console.log('Session established successfully');
            // Redirect to intended destination
            router.push(next);
          } else {
            setError('No session created');
            setTimeout(() => {
              router.push('/sign-in?error=authentication_failed');
            }, 2000);
          }
        })
        .catch((err) => {
          console.error('Exception during code exchange:', err);
          setError(err.message || 'Authentication failed');
          setTimeout(() => {
            router.push('/sign-in?error=' + encodeURIComponent(err.message || 'authentication_failed'));
          }, 2000);
        });
    } else {
      // No code - check if session already exists (might have been set via cookies)
      console.log('No code parameter, checking for existing session...');
      supabase.auth.getSession()
        .then(({ data: { session }, error: sessionError }) => {
          if (session && !sessionError) {
            console.log('Session found, redirecting...');
            router.push(next);
          } else {
            console.warn('No session found and no code parameter');
            setError('OAuth callback failed: No authorization code received');
            console.warn('This usually means:');
            console.warn('1. Redirect URL in Supabase dashboard must match exactly:');
            console.warn('   http://localhost:3000/auth/callback');
            console.warn('2. Google OAuth redirect URI must include:');
            console.warn('   https://[your-project].supabase.co/auth/v1/callback');
            setTimeout(() => {
              router.push('/sign-in?error=oauth_callback_failed');
            }, 3000);
          }
        });
    }
  }, [router, searchParams]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        {error ? (
          <>
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to sign-in page...</p>
          </>
        ) : (
          <>
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Successful</h2>
            <p className="text-gray-600">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}

