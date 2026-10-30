import { Wordmark } from './wordmark';

export function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <h1>
        <Wordmark className="text-4xl" />
      </h1>
    </main>
  );
}
