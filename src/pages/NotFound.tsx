import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <Search size={28} />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">404</p>
        <h1 className="text-3xl font-bold text-white">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          The page you’re looking for is unavailable or no longer exists. Return to the library or explore new music.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <Home size={16} />
            Go home
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Search music
          </Link>
        </div>
      </div>
    </div>
  );
}
