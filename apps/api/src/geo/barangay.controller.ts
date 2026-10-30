import { Controller, Get } from '@nestjs/common';
import { barangaySchema } from '@repo/shared';
import { createZodDto, ZodResponse } from 'nestjs-zod';
import { BarangayService } from './barangay.service.js';

class BarangayDto extends createZodDto(barangaySchema) {}

@Controller('barangays')
export class BarangayController {
  constructor(private readonly barangays: BarangayService) {}

  @Get()
  @ZodResponse({ type: [BarangayDto] })
  list() {
    return this.barangays.list();
  }
}
