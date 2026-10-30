import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { Wordmark } from './wordmark';

export function Home() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1>
        <Wordmark className="text-4xl" />
      </h1>
      <Link to="/dashboard" className={buttonVariants()}>
        Responder dashboard
      </Link>
    </div>
  );
}
