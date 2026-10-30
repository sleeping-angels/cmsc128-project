import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request as ExpressRequest, Response } from 'express';
import { ChannelsService } from './channels.service.js';

/** Chat platform webhooks, verified by each adapter. */
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly channels: ChannelsService) {}

  @All(':platform')
  @AllowAnonymous()
  async handle(
    @Param('platform') platform: string,
    @Req() req: ExpressRequest & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const request = new Request(
      `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      {
        method: req.method,
        headers: req.headers as Record<string, string>,
        // Signatures cover the exact bytes the platform sent.
        body: req.method === 'POST' ? req.rawBody : undefined,
      },
    );
    const response = await this.channels.handleWebhook(platform, request);
    res.status(response.status).send(await response.text());
  }
}
