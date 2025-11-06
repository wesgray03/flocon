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

        // Check if there are auth tokens in the URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('Hash params:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
        });

        if (accessToken) {
          console.log('Found access token, setting session...');
          // We have tokens in the URL, set the session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 2000);
            return;
          }

          if (data.session) {
            console.log('Session set successfully');
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.replace('/projects'), 500);
            return;
          }
        }

        // Fallback: Check for existing session
        console.log('No tokens in URL, checking existing session...');
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Redirecting to login...');
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        if (data.session) {
          console.log('Found existing session');
          setStatus('Authentication successful! Redirecting...');
          setTimeout(() => router.replace('/projects'), 500);
        } else {
          console.log('No session found, setting up listener...');
          // Set up auth state listener as fallback
          setStatus('Completing authentication...');

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, 'Session:', !!session);

            if (event === 'SIGNED_IN' && session) {
              setStatus('Authentication successful! Redirecting...');
              setTimeout(() => router.replace('/projects'), 500);
              subscription.unsubscribe();
            } else if (event === 'SIGNED_OUT') {
              setStatus('Authentication failed. Redirecting to login...');
              setTimeout(() => router.replace('/login'), 2000);
              subscription.unsubscribe();
            }
          });

          // Timeout after 10 seconds if no auth event
          setTimeout(() => {
            console.log('Auth timeout');
            setStatus('Authentication timeout. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 2000);
            subscription.unsubscribe();
          }, 10000);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('Authentication failed. Redirecting to login...');
        setTimeout(() => router.replace('/login'), 2000);
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
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
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
            background: '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#2563eb',
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
