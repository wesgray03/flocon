// components/QBOInvoiceSyncButton.tsx
import { DollarSign, Download, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type QBOInvoiceSyncButtonProps = {
  payAppId: string;
  qboInvoiceId?: string | null;
  onSyncComplete?: () => void;
};

export default function QBOInvoiceSyncButton({
  payAppId,
  qboInvoiceId,
  onSyncComplete,
}: QBOInvoiceSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage('');

      const response = await fetch('/api/qbo/sync-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payAppId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Invoice synced to QuickBooks!');
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handlePullPayment = async () => {
    try {
      setPulling(true);
      setMessage('');

      const response = await fetch('/api/qbo/pull-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payAppId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          `✅ Payment info updated! Total paid: $${data.paymentTotal.toFixed(2)}`
        );
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setPulling(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button
        onClick={handleSync}
        disabled={syncing}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: qboInvoiceId ? '#f0f0f0' : '#2ca01c',
          color: qboInvoiceId ? '#333' : 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: syncing ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          opacity: syncing ? 0.6 : 1,
        }}
      >
        {syncing ? (
          <RefreshCw size={16} className="spin" />
        ) : (
          <DollarSign size={16} />
        )}
        {qboInvoiceId ? 'Re-sync Invoice' : 'Sync to QB'}
      </button>

      {qboInvoiceId && (
        <button
          onClick={handlePullPayment}
          disabled={pulling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: pulling ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            opacity: pulling ? 0.6 : 1,
          }}
        >
          {pulling ? (
            <RefreshCw size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          Pull Payments
        </button>
      )}

      {message && (
        <span style={{ fontSize: '14px', marginLeft: '8px' }}>{message}</span>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
