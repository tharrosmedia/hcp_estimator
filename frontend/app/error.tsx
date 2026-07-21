'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console (visible in browser devtools and Railway logs if streamed)
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <div className="max-w-2xl w-full bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Internal Server Error (caught)</h2>
        <p className="mb-2">Message:</p>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto mb-4">{error.message}</pre>
        {error.stack && (
          <>
            <p className="mb-2">Stack:</p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64 mb-4">{error.stack}</pre>
          </>
        )}
        {error.digest && <p className="text-xs text-muted">Digest: {error.digest}</p>}
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
