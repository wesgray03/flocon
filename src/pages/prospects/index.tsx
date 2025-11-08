// pages/prospects/index.tsx — Prospects Page (Coming Soon)
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProspectsPage() {
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
      } else {
        setSessionEmail(session.user.email ?? null);
      }
    };
    checkSession();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f1ea', padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: '#faf8f5',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Left: FloCon Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <Image
            src="/flocon-logo-v2.png"
            alt="FloCon"
            width={150}
            height={45}
            style={{ height: 'auto', maxHeight: 45, width: 'auto' }}
            priority
          />
        </div>

        {/* Center: Prospects | Projects Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            background: '#ebe5db',
            borderRadius: 8,
            padding: 3,
          }}
        >
          <div
            style={{
              padding: '6px 18px',
              background: '#1e3a5f',
              color: '#fff',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Prospects
          </div>
          <Link
            href="/projects"
            style={{
              padding: '6px 18px',
              background: '#faf8f5',
              color: '#8b7d6b',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Projects
          </Link>
        </div>

        {/* Right: Actions and User Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          {sessionEmail && (
            <span style={{ color: '#64748b', fontSize: 14 }}>
              {sessionEmail}
            </span>
          )}

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: '#334155',
              }}
            >
              ⚙️ Menu
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  minWidth: 160,
                  zIndex: 1000,
                }}
              >
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#c8102e',
                    fontWeight: 600,
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div
        style={{
          background: '#faf8f5',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 64,
          textAlign: 'center',
          marginTop: 120,
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: 16,
          }}
        >
          Prospects
        </h1>
        <p
          style={{
            fontSize: 24,
            color: '#64748b',
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          Coming Soon
        </p>
        <p
          style={{
            fontSize: 16,
            color: '#94a3b8',
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          The Prospects module is currently under development. Check back soon
          to manage your potential projects and leads.
        </p>
      </div>
    </div>
  );
}
