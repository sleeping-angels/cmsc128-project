import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

/** Shown when a guarded route can't load, e.g. the API is unreachable. */
export function RouteError() {
  const router = useRouter();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p>Couldn't load this page. Check your connection and try again.</p>
      {/* invalidate() reruns the guards and resets this error boundary. */}
      <Button onClick={() => void router.invalidate()}>Try again</Button>
    </main>
  );
}
