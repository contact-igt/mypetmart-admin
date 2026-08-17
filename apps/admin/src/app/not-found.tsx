import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-bg p-6">
      <div className="warm-card max-w-md text-center">
        <h1 className="text-xl font-bold">Admin page not found</h1>
        <p className="mt-2 text-sm text-text-primary/60">This admin route does not exist.</p>
        <Link href="/admin" className="button-primary mt-5">Return to dashboard</Link>
      </div>
    </main>
  );
}