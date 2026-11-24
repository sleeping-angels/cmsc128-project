import { severityLevelSchema } from '@repo/shared';
import { cn } from 'cn';
import { label } from '@/lib/format';
import { severityStyles } from '@/lib/report-states';

/* Most severe first. */
const SEVERITIES = severityLevelSchema.options.toReversed();

/** The pin colors, for a map corner; `inline` lays them in one row without a title. */
export function SeverityLegend({
  inline = false,
  className,
}: {
  inline?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1.5 rounded-lg border bg-background px-3 py-2.5 text-xs shadow-sm',
        inline ? 'flex-wrap gap-x-3 py-1.5' : 'flex-col',
        className,
      )}
    >
      {!inline && (
        <span className="font-medium text-muted-foreground">Severity</span>
      )}
      {SEVERITIES.map((severity) => (
        <span key={severity} className="flex items-center gap-1.5">
          <span
            className={cn(
              'size-2.5 rounded-full',
              severityStyles[severity].solid,
            )}
          />
          {label(severity)}
        </span>
      ))}
    </div>
  );
}
