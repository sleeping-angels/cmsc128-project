import { cn } from 'cn';
import { useRealtimeConnected } from '../hooks/use-realtime';

/**
 * Whether the page updates by itself: "Live" while the realtime connection is
 * up, a warning while it reconnects, since numbers may then be out of date.
 */
export function LiveStatus({ className }: { className?: string }) {
  const connected = useRealtimeConnected();
  return (
    <span
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        connected ? 'text-success' : 'text-warning',
        className,
      )}
      title={
        connected
          ? 'Changes appear here automatically.'
          : 'Reconnecting. What you see may be out of date until then.'
      }
    >
      <span className="relative flex size-2">
        {connected && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            connected ? 'bg-success' : 'bg-warning',
          )}
        />
      </span>
      {connected ? 'Live' : 'Offline, reconnecting…'}
    </span>
  );
}
