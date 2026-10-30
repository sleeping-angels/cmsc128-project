import { APP_NAME } from '@repo/shared';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

/** "MIG" followed by the helmet as the "O". Screen readers still read "MIGO". */
export function Wordmark({
  className,
  textClassName,
  logoClassName,
}: {
  className?: string;
  textClassName?: string;
  logoClassName?: string;
}) {
  return (
    <span className={cn('flex items-center font-bold text-primary', className)}>
      <span className={textClassName}>{APP_NAME.slice(0, -1)}</span>
      <Logo className={cn('ml-0.5 size-[0.9em]!', logoClassName)} />
      <span className="sr-only">{APP_NAME.slice(-1)}</span>
    </span>
  );
}
