"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-bg p-6">
      <div className="warm-card max-w-md text-center">
        <h1 className="text-xl font-bold">Admin page unavailable</h1>
        <p className="mt-2 text-sm text-text-primary/60">The page could not be loaded. Try again.</p>
        <button type="button" onClick={reset} className="button-primary mt-5">Try again</button>
      </div>
    </main>
  );
}