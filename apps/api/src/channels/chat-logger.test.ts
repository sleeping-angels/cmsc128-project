import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatLogger } from './chat-logger.js';

describe('ChatLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('folds extra arguments into the message', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    new ChatLogger().info('Chat instance initialized', { adapters: [] });
    expect(log).toHaveBeenCalledWith(
      'Chat instance initialized { adapters: [] }',
    );
  });

  it('keeps a trailing string out of the context', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    new ChatLogger().warn('Post failed for', 'messenger:123');
    expect(warn).toHaveBeenCalledWith('Post failed for messenger:123');
  });

  it('includes errors in the message', () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    new ChatLogger().error('Webhook failed', new Error('boom'));
    const [args] = error.mock.calls;
    expect(args).toHaveLength(1);
    expect(args?.[0]).toContain('Webhook failed Error: boom');
  });

  it('prefixes child contexts', () => {
    const child = new ChatLogger().child('messenger');
    expect(child).toEqual(new ChatLogger('ChatSDK:messenger'));
  });
});
