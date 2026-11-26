import type { ReportFeedItem } from '@repo/shared';
import { ReportMarker } from '@/components/report-marker';
import { ReportPopup } from './report-popup';

/** A pin with a popup for each report that has a location; `focusId`'s pin is drawn larger. */
export function ReportPins({
  reports,
  focusId,
}: {
  reports: ReportFeedItem[];
  focusId?: string;
}) {
  return reports.map(
    (report) =>
      report.location && (
        <ReportMarker
          key={report.id}
          report={report}
          lngLat={report.location}
          focused={report.id === focusId}
        >
          <ReportPopup report={report} />
        </ReportMarker>
      ),
  );
}
