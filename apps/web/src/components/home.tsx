import { APP_NAME } from '@repo/shared';

export function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <h1 className="text-4xl font-bold">{APP_NAME}</h1>
    </main>
  );
}
