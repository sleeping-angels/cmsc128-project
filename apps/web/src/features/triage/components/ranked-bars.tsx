import { cn } from 'cn';
import { type LucideIcon, Signal } from 'lucide-react';
import {
  Bar,
  BarChart,
  LabelList,
  XAxis,
  YAxis,
  type YAxisTickContentProps,
} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const rankedConfig = {
  count: { label: 'Reports', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/**
 * Horizontal bars, one per row, labeled with their count. The height is fixed
 * by `className`, so cards side by side match however many rows there are.
 */
export function RankedBars({
  rows,
  className,
}: {
  rows: {
    label: string;
    count: number;
    color?: string;
    /** Drawn before the label, in the bar's color. */
    icon?: LucideIcon;
    /** Draws the full signal faintly behind the icon, as severity badges do. */
    track?: boolean;
  }[];
  className: string;
}) {
  const data = rows.map((row) => ({
    ...row,
    fill: row.color ?? 'var(--color-count)',
  }));
  return (
    <ChartContainer
      config={rankedConfig}
      className={cn('aspect-auto w-full', className)}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 32 }}
      >
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={AXIS_WIDTH}
          // Every row keeps its label; recharts would otherwise skip some to avoid overlap.
          interval={0}
          tick={(props: YAxisTickContentProps) => (
            <RankedTick {...props} row={rows[props.index]} />
          )}
        />
        <XAxis dataKey="count" type="number" allowDecimals={false} hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="label" />}
        />
        <Bar dataKey="count" maxBarSize={24}>
          <LabelList
            dataKey="count"
            position="right"
            fill="var(--foreground)"
            className="tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Room for a ranked chart's labels, icon included. */
const AXIS_WIDTH = 128;

/** Labels longer than this get an ellipsis so they fit beside the bars. */
const MAX_LABEL = 16;

/** A row's label, left-aligned in the axis, with its icon before it when it has one. */
function RankedTick({
  x,
  y,
  row,
}: YAxisTickContentProps & {
  row?: { label: string; color?: string; icon?: LucideIcon; track?: boolean };
}) {
  if (!row) return null;
  const { label, color, icon: Icon, track } = row;
  // `x` sits a tick's length (8px) left of the axis' right edge; start at its left edge.
  const left = Number(x) - AXIS_WIDTH + 8;
  const text =
    label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label;
  return (
    <g transform={`translate(${left},${Number(y)})`}>
      <title>{label}</title>
      {track && (
        <Signal
          x={0}
          y={-7}
          width={14}
          height={14}
          aria-hidden
          opacity={0.25}
          color={color}
        />
      )}
      {Icon && (
        <Icon
          x={0}
          y={-7}
          width={14}
          height={14}
          aria-hidden
          color={color ?? 'var(--muted-foreground)'}
        />
      )}
      <text
        x={Icon ? 20 : 0}
        dy="0.355em"
        textAnchor="start"
        className="fill-muted-foreground text-xs"
      >
        {text}
      </text>
    </g>
  );
}
