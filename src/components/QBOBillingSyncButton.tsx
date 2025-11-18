/**
 * QuickBooks Billing Sync Button
 * Syncs all pay apps for a project to QuickBooks
 */
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

type QBOBillingSyncButtonProps = {
  projectId: string;
  onSyncComplete?: () => void;
};

export default function QBOBillingSyncButton({
  projectId,
  onSyncComplete,
}: QBOBillingSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');

    try {
      const response = await fetch('/api/qbo/sync-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          `✓ Synced ${data.syncedCount} invoice${data.syncedCount !== 1 ? 's' : ''}`
        );
        if (onSyncComplete) {
          setTimeout(() => {
            onSyncComplete();
          }, 1000);
        }
      } else {
        setMessage(`✗ ${data.error || 'Sync failed'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setMessage('✗ Network error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleSync}
        disabled={syncing}
        style={{
          background: syncing ? '#e0e0e0' : '#2E7D32',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          border: 'none',
          cursor: syncing ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <RefreshCw
          size={16}
          style={{
            animation: syncing ? 'spin 1s linear infinite' : 'none',
          }}
        />
        {syncing ? 'Syncing...' : 'Sync to QBO'}
      </button>
      {message && (
        <span
          style={{
            fontSize: 13,
            color: message.startsWith('✓') ? '#2E7D32' : '#d32f2f',
          }}
        >
          {message}
        </span>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
