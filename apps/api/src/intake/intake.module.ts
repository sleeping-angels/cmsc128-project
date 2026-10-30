import { Global, Module } from '@nestjs/common';
import { IntakeService } from './intake.service.js';
import { REPORT_PARSER, UnavailableParser } from './parser.js';

@Global()
@Module({
  providers: [
    IntakeService,
    { provide: REPORT_PARSER, useClass: UnavailableParser },
  ],
  exports: [IntakeService],
})
export class IntakeModule {}
