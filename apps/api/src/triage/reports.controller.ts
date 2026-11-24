import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  attentionQueueSchema,
  reportDetailSchema,
  reportFeedItemSchema,
  reportIdParamsSchema,
  reportSummarySchema,
  reportTrendsQuerySchema,
  reportTrendsSchema,
  responseTimesSchema,
} from '@repo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { Roles } from '../auth/roles.decorator.js';
import { ReportInsightsService } from './report-insights.service.js';
import { ReportsService } from './reports.service.js';

// codec: the methods return Dates; the serializer encodes them to ISO strings.
class ReportFeedItemDto extends createZodDto(reportFeedItemSchema, {
  codec: true,
}) {}
class ReportDetailDto extends createZodDto(reportDetailSchema, {
  codec: true,
}) {}
class ReportSummaryDto extends createZodDto(reportSummarySchema) {}
class ResponseTimesDto extends createZodDto(responseTimesSchema) {}
class ReportTrendsDto extends createZodDto(reportTrendsSchema, {
  codec: true,
}) {}
class ReportTrendsQueryDto extends createZodDto(reportTrendsQuerySchema) {}
class AttentionQueueDto extends createZodDto(attentionQueueSchema, {
  codec: true,
}) {}

// The global ZodValidationPipe rejects a non-UUID id with a 400.
class ReportIdParamsDto extends createZodDto(reportIdParamsSchema) {}

/** Read-only for now; editing arrives with #39. */
// Both routes expose incident and resident data, so the role check runs on the API (#41).
@Roles(['responder', 'admin'])
@Controller('triage/reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly insights: ReportInsightsService,
  ) {}

  /** The feed list for /dashboard/incidents. */
  @Get()
  @ZodResponse({ type: [ReportFeedItemDto] })
  findAll() {
    return this.reports.findFeed();
  }

  // The dashboard home's routes are declared before `:id` so they match first.

  /** Open report counts. */
  @Get('summary')
  @ZodResponse({ type: ReportSummaryDto })
  summary() {
    return this.insights.summarize();
  }

  /** Open reports that need a responder, most urgent first. */
  @Get('attention')
  @ZodResponse({ type: AttentionQueueDto })
  attention() {
    return this.insights.attention();
  }

  /** Median times from report to help, this week and last. */
  @Get('response-times')
  @ZodResponse({ type: ResponseTimesDto })
  responseTimes() {
    return this.insights.responseTimes();
  }

  /** Report counts over a range, for the trend charts; `?range=7d` by default. */
  @Get('trends')
  @ZodResponse({ type: ReportTrendsDto })
  trends(@Query() { range }: ReportTrendsQueryDto) {
    return this.insights.trends(range);
  }

  @Get(':id')
  @ZodResponse({ type: ReportDetailDto })
  async findOne(@Param() { id }: ReportIdParamsDto) {
    const detail = await this.reports.findDetail(id);
    if (!detail) throw new NotFoundException('Report not found');
    return detail;
  }
}
