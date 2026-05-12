import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">403</h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            You do not have permission to access this page.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
