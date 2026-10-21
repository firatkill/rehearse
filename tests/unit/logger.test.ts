import { expect, it } from 'vitest';
import { createLogger, getLogger } from '@/lib/logger';
import { getEnv } from '@/lib/env';

it('TC-008: FR-56, TRD §22 redacts sensitive fields in captured output', () => {
  const lines: string[] = [];
  const logger = createLogger(getEnv(), {
    write(line) {
      lines.push(line);
    },
  });
  logger.info(
    {
      transcript: 'private-transcript',
      prompt: 'private-prompt',
      output: 'private-output',
      token: 'private-token',
      req: { headers: { authorization: 'private-auth', cookie: 'private-cookie' } },
      transcriptChars: 18,
    },
    'feedback.done',
  );
  const line = lines.join('');
  expect(line).not.toContain('private-');
  expect(line.match(/\[Redacted\]/g)).toHaveLength(6);
  expect(JSON.parse(line)).toMatchObject({
    app: 'rehearse',
    transcriptChars: 18,
    msg: 'feedback.done',
  });
  expect(getLogger()).toBe(getLogger());
});
