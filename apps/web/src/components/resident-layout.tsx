import { Link, Outlet } from '@tanstack/react-router';
import { Wordmark } from '@/components/wordmark';

export function ResidentLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/">
            <Wordmark className="text-xl" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="text-muted-foreground border-t py-4 text-center text-sm">
        MDRRMO Miagao
      </footer>
    </div>
  );
}
