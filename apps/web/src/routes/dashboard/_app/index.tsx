import { type TrendRange, trendRangeSchema } from '@repo/shared';
import { createFileRoute } from '@tanstack/react-router';
import { DashboardHome } from '@/components/dashboard-home';

export const Route = createFileRoute('/dashboard/_app/')({
  // ?range= picks the trend charts' period, so a refresh or shared link keeps it.
  validateSearch: (search): { range?: TrendRange } => {
    const range = trendRangeSchema.safeParse(search.range);
    return { range: range.success ? range.data : undefined };
  },
  component: function HomePage() {
    const { range = '7d' } = Route.useSearch();
    const navigate = Route.useNavigate();
    return (
      <DashboardHome
        range={range}
        onRangeChange={(next) =>
          void navigate({
            search: { range: next === '7d' ? undefined : next },
            replace: true,
          })
        }
      />
    );
  },
});
