import { createMessengerAdapter } from '@chat-adapter/messenger';
import { APP_NAME } from '@repo/shared';
import { type Adapter, Chat, type StateAdapter } from 'chat';
import { env } from '../config/env.js';

export const BOT = Symbol('BOT');

export type Bot = Chat<Record<string, Adapter>>;

/** Adapters are keyed by `source_channel`, which also prefixes thread IDs. */
function adapters() {
  const result: Record<string, Adapter> = {};
  const appSecret = env.FACEBOOK_APP_SECRET;
  const pageAccessToken = env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const verifyToken = env.FACEBOOK_VERIFY_TOKEN;
  if (appSecret && pageAccessToken && verifyToken) {
    result.messenger = createMessengerAdapter({
      appSecret,
      pageAccessToken,
      verifyToken,
    });
  }
  return result;
}

export function createBot(state: StateAdapter): Bot {
  return new Chat({
    userName: APP_NAME,
    adapters: adapters(),
    state,
    // Every message must reach the Message table; the default drops overlaps.
    concurrency: 'concurrent',
  });
}
