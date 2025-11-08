import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Processing authentication...');
        console.log('Starting auth callback...');
        console.log('Current URL:', window.location.href);

        // First, try to handle URL hash/query parameters that might contain auth tokens
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const accessToken =
          hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken =
          hashParams.get('refresh_token') || urlParams.get('refresh_token');
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        console.log('URL Parameters:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          code: !!code,
          error: error,
          hash: window.location.hash,
          search: window.location.search,
        });

        if (error) {
          console.error('OAuth error in URL:', error);
          setStatus(`Authentication failed: ${error}`);
          setTimeout(() => router.replace('/login'), 3000);
          return;
        }

        if (accessToken) {
          console.log('Found access token, setting session...');
          setStatus('Setting up your session...');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('Session setup failed. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 3000);
            return;
          }

          if (data.session) {
            console.log('Session set successfully:', data.session);
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.replace('/projects'), 1000);
            return;
          }
        }

        // If no tokens in URL, try multiple approaches to get session
        console.log('No tokens in URL, checking for existing session...');
        setStatus('Checking authentication status...');

        // Try getting session multiple times with delays
        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`Session check attempt ${attempt}/5`);

          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error(`Session check error (attempt ${attempt}):`, error);
            if (attempt === 5) {
              setStatus('Authentication failed. Redirecting to login...');
              setTimeout(() => router.replace('/login'), 3000);
              return;
            }
          } else if (data.session) {
            console.log(`Session found on attempt ${attempt}:`, data.session);
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.replace('/projects'), 1000);
            return;
          }

          // Wait before next attempt
          if (attempt < 5) {
            setStatus(`Checking authentication... (${attempt}/5)`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // If all session checks failed, set up auth state listener as final fallback
        console.log(
          'No session found after 5 attempts, setting up listener...'
        );
        setStatus('Waiting for authentication to complete...');

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event, 'Session:', !!session);

          if (event === 'SIGNED_IN' && session) {
            console.log('Auth state listener: signed in');
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.replace('/projects'), 1000);
            subscription.unsubscribe();
          } else if (event === 'SIGNED_OUT') {
            console.log('Auth state listener: signed out');
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 3000);
            subscription.unsubscribe();
          }
        });

        // Extended timeout - 30 seconds instead of 10
        setTimeout(() => {
          console.log('Auth timeout after 30 seconds');
          setStatus(
            'Authentication timeout. This may be a configuration issue. Redirecting to login...'
          );
          setTimeout(() => router.replace('/login'), 5000);
          subscription.unsubscribe();
        }, 30000);
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setStatus('Authentication failed. Redirecting to login...');
        setTimeout(() => router.replace('/login'), 3000);
      }
    };

    // Only run when router is ready
    if (router.isReady) {
      handleAuthCallback();
    }
  }, [router, router.isReady]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#faf8f5',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5dfd5',
          borderRadius: 12,
          padding: 24,
          width: 400,
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 20,
            color: '#0f172a',
          }}
        >
          Authenticating...
        </h1>
        <p style={{ marginTop: 0, color: '#475569' }}>{status}</p>
        <div
          style={{
            marginTop: 16,
            height: 4,
            background: '#e5dfd5',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#1e3a5f',
              borderRadius: 2,
              animation: 'loading 2s ease-in-out infinite',
              width: '50%',
              transform: 'translateX(-100%)',
            }}
          />
        </div>
        <style jsx>{`
          @keyframes loading {
            0% {
              transform: translateX(-100%);
            }
            50% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(300%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
