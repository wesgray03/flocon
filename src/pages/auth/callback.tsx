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

        // Listen for auth state changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event, 'Session:', !!session);

          if (event === 'SIGNED_IN' && session) {
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => router.replace('/projects'), 500);
          } else if (event === 'SIGNED_OUT') {
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 2000);
          }
        });

        // Also immediately check for existing session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('Authentication failed. Redirecting to login...');
          setTimeout(() => router.replace('/login'), 2000);
          return;
        }

        if (data.session) {
          setStatus('Authentication successful! Redirecting...');
          setTimeout(() => router.replace('/projects'), 500);
        } else {
          // Wait for auth state change event
          setStatus('Completing authentication...');

          // Timeout after 10 seconds if no auth event
          setTimeout(() => {
            setStatus('Authentication timeout. Redirecting to login...');
            setTimeout(() => router.replace('/login'), 2000);
          }, 10000);
        }

        // Cleanup subscription when component unmounts
        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('Authentication failed. Redirecting to login...');
        setTimeout(() => router.replace('/login'), 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

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
