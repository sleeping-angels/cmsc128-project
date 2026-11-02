import { createPostgresState } from '@chat-adapter/state-pg';
import { Global, Module } from '@nestjs/common';
import { pool } from '../database/client.js';
import { BOT, createBot } from './bot.js';
import { ChatLogger } from './chat-logger.js';
import { ChannelsService } from './channels.service.js';
import { MessageLogService } from './message-log.service.js';
import { WebhooksController } from './webhooks.controller.js';

@Global()
@Module({
  controllers: [WebhooksController],
  providers: [
    ChannelsService,
    MessageLogService,
    // State-pg creates its own chat_state_* tables, outside drizzle-kit.
    {
      provide: BOT,
      useFactory: () =>
        createBot(
          createPostgresState({
            client: pool,
            logger: new ChatLogger().child('state-pg'),
          }),
        ),
    },
  ],
  exports: [ChannelsService],
})
export class ChannelsModule {}
