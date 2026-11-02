import { inspect } from 'node:util';
import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from 'chat';

/**
 * Sends Chat SDK logs through Nest, so they share the app's log format.
 * Extra arguments are folded into the message: Nest would otherwise read a
 * trailing string as the context and an error as the stack.
 */
export class ChatLogger implements Logger {
  private readonly logger: NestLogger;

  constructor(private readonly context = 'ChatSDK') {
    this.logger = new NestLogger(context);
  }

  child(prefix: string) {
    return new ChatLogger(`${this.context}:${prefix}`);
  }

  /** Dropped, matching Chat SDK's default `info` level. */
  debug() {}

  info(message: string, ...args: unknown[]) {
    this.logger.log(fold(message, args));
  }

  warn(message: string, ...args: unknown[]) {
    this.logger.warn(fold(message, args));
  }

  error(message: string, ...args: unknown[]) {
    this.logger.error(fold(message, args));
  }
}

function fold(message: string, args: unknown[]) {
  return [
    message,
    ...args.map((arg) =>
      typeof arg === 'string' ? arg : inspect(arg, { breakLength: Infinity }),
    ),
  ].join(' ');
}
