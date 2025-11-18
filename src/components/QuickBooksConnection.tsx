// QuickBooks Connection Component
// Simple UI for connecting/disconnecting from QuickBooks Online
import { useEffect, useState } from 'react';

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  accessTokenExpired?: boolean;
  refreshTokenExpired?: boolean;
  needsReauthorization?: boolean;
}

export default function QuickBooksConnection() {
  const [status, setStatus] = useState<QBOStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/qbo/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking QBO status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await fetch('/api/qbo/connect');
      const data = await res.json();

      if (data.authUri) {
        // Redirect to QuickBooks authorization page
        window.location.href = data.authUri;
      }
    } catch (error) {
      console.error('Error connecting to QuickBooks:', error);
      alert('Failed to connect to QuickBooks');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from QuickBooks?')) {
      return;
    }

    try {
      setConnecting(true);
      const res = await fetch('/api/qbo/disconnect', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        await checkStatus();
        alert('Successfully disconnected from QuickBooks');
      }
    } catch (error) {
      console.error('Error disconnecting from QuickBooks:', error);
      alert('Failed to disconnect from QuickBooks');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          QuickBooks Online
        </h3>
        <p className="text-gray-600">Checking connection status...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        QuickBooks Online
      </h3>

      {status?.connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-900">Connected</span>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Company ID:</span> {status.realmId}
            </p>
            {status.needsReauthorization && (
              <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Your refresh token has expired. Please reconnect to
                  QuickBooks.
                </p>
              </div>
            )}
            {status.accessTokenExpired && !status.needsReauthorization && (
              <p className="text-yellow-600 text-sm">
                Access token expired - will refresh automatically on next API
                call
              </p>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-300"></div>
            <span className="text-sm font-medium text-gray-900">
              Not Connected
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Connect to QuickBooks Online to sync project data automatically.
          </p>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Connecting...' : 'Connect to QuickBooks'}
          </button>
        </div>
      )}
    </div>
  );
}
