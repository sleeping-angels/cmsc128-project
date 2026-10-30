import { Injectable } from '@nestjs/common';
import type { ParsedReport } from '@repo/shared';

export const REPORT_PARSER = Symbol('REPORT_PARSER');

/** Extracts report fields from a resident's free-form message. */
export interface ReportParser {
  /** Null when parsing fails, times out or is unavailable. */
  parse(text: string): Promise<ParsedReport | null>;
}

/**
 * Stand-in until the classifier (#27) lands. Parsing is always unavailable,
 * so intake falls back to the guided form.
 */
@Injectable()
export class UnavailableParser implements ReportParser {
  parse(): Promise<ParsedReport | null> {
    return Promise.resolve(null);
  }
}
