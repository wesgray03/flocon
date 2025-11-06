export default function Debug() {
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Environment Debug</h2>
      <p>
        <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{' '}
        {process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'}
      </p>
      <p>
        <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{' '}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'}
      </p>
      <p>
        <strong>Current Origin:</strong>{' '}
        {typeof window !== 'undefined' ? window.location.origin : 'SERVER SIDE'}
      </p>
    </div>
  );
}
