// QuickBooks Sync Button Component
// Syncs a project to QuickBooks Online
import { useState } from 'react';

interface QBOSyncButtonProps {
  engagementId: string;
  projectNumber?: string | null;
  qboJobId?: string | null;
  onSyncComplete?: () => void;
}

export default function QBOSyncButton({
  engagementId,
  projectNumber,
  qboJobId,
  onSyncComplete,
}: QBOSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSync = async () => {
    if (!projectNumber) {
      setError(
        'Project must have a project number before syncing to QuickBooks'
      );
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/qbo/sync-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagementId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        onSyncComplete?.();
      } else {
        setError(data.error || 'Failed to sync to QuickBooks');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSyncing(false);
    }
  };

  const isSynced = !!qboJobId;

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={syncing || !projectNumber}
        className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isSynced
            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500'
            : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500'
        }`}
        title={
          !projectNumber
            ? 'Project number required'
            : isSynced
              ? 'Re-sync to QuickBooks'
              : 'Sync to QuickBooks'
        }
      >
        {syncing ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Syncing...
          </>
        ) : success ? (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Synced!
          </>
        ) : isSynced ? (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Re-sync to QuickBooks
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Sync to QuickBooks
          </>
        )}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {isSynced && !success && !error && (
        <div className="text-xs text-gray-600">
          <span className="inline-flex items-center">
            <svg
              className="h-3 w-3 mr-1 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Synced to QuickBooks
          </span>
        </div>
      )}
    </div>
  );
}
