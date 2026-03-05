"use client";
import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Sentry Test Page</h1>
        <p className="mt-2 text-sm text-gray-500">
          Click the button below to throw a test error. It should appear in your Sentry dashboard within seconds.
        </p>
        <button
          onClick={() => {
            throw new Error("Sentry test error from Apploi Scheduling — " + new Date().toISOString());
          }}
          className="mt-6 w-full rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700"
        >
          Throw Test Error
        </button>
        <button
          onClick={() => {
            Sentry.captureMessage("Manual Sentry test from Apploi Scheduling", "info");
            alert("Message sent to Sentry! Check your dashboard.");
          }}
          className="mt-3 w-full rounded-xl border border-purple-200 bg-purple-50 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-100"
        >
          Send Test Message
        </button>
      </div>
    </div>
  );
}
