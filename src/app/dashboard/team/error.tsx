
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-red-200 bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="mt-1 text-sm text-gray-500">{error.message || "An unexpected error occurred"}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: "#00A1AB" }}
      >
        Try Again
      </button>
    </div>
  );
}

