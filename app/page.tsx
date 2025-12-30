'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [framerUrl, setFramerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_FRAMER_URL || '';
    setFramerUrl(url);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Listen for postMessage events from the Framer iframe
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from Framer origin or any origin (for development)
      if (event.data && event.data.type === 'navigate-to-app') {
        window.location.href = '/app';
      }
    };

    // Monitor for Stripe redirects and intercept them
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      const url = args[2] as string;
      if (url && (url.includes('stripe.com') || url.includes('/app'))) {
        // If trying to navigate to /app from iframe, redirect parent window
        if (url.includes('/app')) {
          window.location.href = '/app';
          return;
        }
        if (url.includes('stripe.com')) {
          window.location.href = '/app';
          return;
        }
      }
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      const url = args[2] as string;
      if (url && (url.includes('stripe.com') || url.includes('/app'))) {
        if (url.includes('/app')) {
          window.location.href = '/app';
          return;
        }
        if (url.includes('stripe.com')) {
          window.location.href = '/app';
          return;
        }
      }
      return originalReplaceState.apply(history, args);
    };

    // Monitor iframe navigation changes
    const checkIframeUrl = () => {
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          const iframeUrl = iframe.contentWindow.location.href;
          // If iframe navigates to /app or stripe, redirect parent
          if (iframeUrl.includes('/app') || iframeUrl.includes('stripe.com')) {
            window.location.href = '/app';
          }
        }
      } catch (e) {
        // Cross-origin restrictions - this is expected for Framer
        // We'll rely on postMessage instead
      }
    };

    // Also check for actual navigation to Stripe in parent window
    const checkUrl = () => {
      if (window.location.href.includes('stripe.com')) {
        window.location.href = '/app';
      }
    };

    window.addEventListener('message', handleMessage);
    const intervalId = setInterval(() => {
      checkUrl();
      checkIframeUrl();
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(intervalId);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="w-full bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">AI Outfit Generator</div>
          <Link
            href="/app"
            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Try It Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Framer Landing Page Content */}
      <div className="flex-1 w-full relative">
        {framerUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading landing page...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={framerUrl}
              className="w-full h-full border-0"
              style={{ minHeight: 'calc(100vh - 80px)' }}
              allow="fullscreen"
              loading="lazy"
              onLoad={() => {
                setIsLoading(false);
                // Try to detect if iframe navigated to /app
                setTimeout(() => {
                  try {
                    const iframe = iframeRef.current;
                    if (iframe && iframe.contentWindow) {
                      const iframeUrl = iframe.contentWindow.location.href;
                      if (iframeUrl.includes('/app')) {
                        window.location.href = '/app';
                      }
                    }
                  } catch (e) {
                    // Cross-origin - expected
                  }
                }, 500);
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50">
            <div className="text-center p-8 max-w-2xl">
              <h1 className="text-4xl font-bold mb-4">AI Outfit Generator</h1>
              <p className="text-lg text-gray-600 mb-6">
                Create stunning outfit combinations with AI-powered virtual try-on technology.
                Upload your clothing items and see how they look together instantly.
              </p>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  To connect your Framer landing page, set the <code className="bg-gray-200 px-2 py-1 rounded">NEXT_PUBLIC_FRAMER_URL</code> environment variable
                  or update the URL in <code className="bg-gray-200 px-2 py-1 rounded">app/page.tsx</code>
                </p>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-lg"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
