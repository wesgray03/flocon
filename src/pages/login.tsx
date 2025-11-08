import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already logged in
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace('/projects');
      } else {
        setChecking(false);
      }
    })();
  }, [router]);

  const signInWithMicrosoft = async () => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid email profile',
        redirectTo,
      },
    });
    if (error) alert(`Sign-in error: ${error.message}`);
  };

  if (checking) {
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
        <p style={{ color: colors.textSecondary }}>Checking authentication...</p>
      </div>
    );
  }

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
      <Head>
        <title>Sign in</title>
      </Head>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5dfd5',
          borderRadius: 12,
          padding: 24,
          width: 400,
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 20,
            color: colors.textPrimary,
          }}
        >
          Sign in
        </h1>
        <p style={{ marginTop: 0, marginBottom: 16, color: colors.textMuted }}>
          Use your Microsoft (Azure AD) account to continue.
        </p>
        <button
          onClick={signInWithMicrosoft}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#1e3a5f',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
