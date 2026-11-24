import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  reportDetailSchema,
  reportFeedItemSchema,
  reportIdParamsSchema,
  reportSummarySchema,
} from '@repo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { Roles } from '../auth/roles.decorator.js';
import { ReportsService } from './reports.service.js';

// codec: the methods return Dates; the serializer encodes them to ISO strings.
class ReportFeedItemDto extends createZodDto(reportFeedItemSchema, {
  codec: true,
}) {}
class ReportDetailDto extends createZodDto(reportDetailSchema, {
  codec: true,
}) {}
class ReportSummaryDto extends createZodDto(reportSummarySchema) {}

// The global ZodValidationPipe rejects a non-UUID id with a 400.
class ReportIdParamsDto extends createZodDto(reportIdParamsSchema) {}

/** Read-only for now; editing arrives with #39. */
// Both routes expose incident and resident data, so the role check runs on the API (#41).
@Roles(['responder', 'admin'])
@Controller('triage/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** The feed list for /dashboard/incidents. */
  @Get()
  @ZodResponse({ type: [ReportFeedItemDto] })
  findAll() {
    return this.reports.findFeed();
  }

  /** Open report counts for the dashboard home. Declared before `:id` so it matches first. */
  @Get('summary')
  @ZodResponse({ type: ReportSummaryDto })
  summary() {
    return this.reports.summarize();
  }

  @Get(':id')
  @ZodResponse({ type: ReportDetailDto })
  async findOne(@Param() { id }: ReportIdParamsDto) {
    const detail = await this.reports.findDetail(id);
    if (!detail) throw new NotFoundException('Report not found');
    return detail;
  }
}
