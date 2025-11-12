// pages/proposals/[id].tsx - Coming Soon Page for Proposals
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SharedMenu } from '@/components/layout/SharedMenu';
import {
  getPrimaryPartiesForEngagements,
  type PartyRole,
} from '@/lib/engagementParties';
import { supabase } from '@/lib/supabaseClient';
import { colors } from '@/styles/theme';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ProposalPage() {
  const router = useRouter();
  const { id } = router.query;
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prospectName, setProspectName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [pmName, setPmName] = useState<string | null>(null);
  const [architectName, setArchitectName] = useState<string | null>(null);

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

  useEffect(() => {
    if (id) loadProspectName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProspectName = async () => {
    try {
      const { data, error } = await supabase
        .from('engagements')
        .select('id,name')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return;
      setProspectName(data.name);
      // Load primary parties (customer, project_manager, architect)
      const roles: PartyRole[] = ['customer', 'project_manager', 'architect'];
      const parties = await getPrimaryPartiesForEngagements([data.id], roles);
      for (const p of parties) {
        if (p.role === 'customer') setCustomerName(p.party_name ?? null);
        if (p.role === 'project_manager') setPmName(p.party_name ?? null);
        if (p.role === 'architect') setArchitectName(p.party_name ?? null);
      }
    } catch (err) {
      console.error('Error loading prospect:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f1ea', padding: 24 }}>
      {/* Header */}
      <DashboardHeader
        sessionEmail={sessionEmail}
        activeTab="prospects"
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuItems={
          <SharedMenu
            onClose={() => setMenuOpen(false)}
            onOpenCompanies={() => {}}
            onOpenContacts={() => {}}
            onOpenUsers={() => {}}
          />
        }
      />

      {/* Coming Soon Content */}
      <div
        style={{
          background: colors.cardBackground,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 48,
          textAlign: 'center',
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              width: 120,
              height: 120,
              margin: '0 auto 24px',
              background: colors.tableHeader,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 64,
            }}
          >
            📋
          </div>
          <h1
            style={{
              color: colors.navy,
              fontSize: 36,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Proposals Coming Soon
          </h1>
          {prospectName && (
            <div style={{ marginBottom: 24 }}>
              <p
                style={{
                  color: colors.textSecondary,
                  fontSize: 18,
                  margin: '0 0 12px',
                }}
              >
                for{' '}
                <strong style={{ color: colors.textPrimary }}>
                  {prospectName}
                </strong>
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  justifyContent: 'center',
                }}
              >
                <PartyBadge label="Customer" value={customerName} />
                <PartyBadge label="Project Manager" value={pmName} />
                <PartyBadge label="Architect" value={architectName} />
              </div>
            </div>
          )}
          <p
            style={{
              color: colors.textSecondary,
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            The Proposals feature is currently under development. Soon
            you&apos;ll be able to create, manage, and track detailed proposals
            for your prospects with automated calculations, professional
            formatting, and seamless integration with your project workflow.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => router.push('/prospects')}
            style={{
              background: colors.navy,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back to Prospects
          </button>
          <button
            type="button"
            onClick={() => router.push('/projects')}
            style={{
              background: colors.toggleBackground,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View Projects
          </button>
        </div>
      </div>
    </div>
  );
}

function PartyBadge({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      style={{
        background: '#f0ebe3',
        border: '1px solid #e5dfd5',
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 160,
        textAlign: 'center',
      }}
    >
      <div
        style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
        {value || '—'}
      </div>
    </div>
  );
}
