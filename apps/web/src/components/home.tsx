import { APP_NAME } from '@repo/shared';
import { Logo } from './logo';

export function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <h1 className="flex items-center text-primary text-4xl font-bold">
        {APP_NAME.slice(0, -1)}
        <Logo className="ml-0.5 size-[0.9em]" />
        <span className="sr-only">{APP_NAME.slice(-1)}</span>
      </h1>
    </main>
  );
}
