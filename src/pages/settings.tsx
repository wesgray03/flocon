// Settings Page
// Manage application settings and integrations
import QuickBooksConnection from '@/components/QuickBooksConnection';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    // Check for OAuth callback messages in URL
    const { qbo_connected, qbo_error } = router.query;

    if (qbo_connected === 'true') {
      setMessage({
        type: 'success',
        text: 'Successfully connected to QuickBooks Online!',
      });
      // Clean up URL
      router.replace('/settings', undefined, { shallow: true });
    } else if (qbo_error) {
      setMessage({
        type: 'error',
        text: `Failed to connect to QuickBooks: ${qbo_error}`,
      });
      // Clean up URL
      router.replace('/settings', undefined, { shallow: true });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

          {message && (
            <div
              className={`mb-6 rounded-md p-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Integrations
              </h2>
              <QuickBooksConnection />
            </div>

            {/* Add more settings sections here as needed */}
          </div>
        </div>
      </div>
    </div>
  );
}
