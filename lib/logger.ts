import 'server-only';
import { pino, type DestinationStream, type Logger } from 'pino';
import { getEnv, type Env } from '@/lib/env';
import { APP_VERSION } from '@/lib/version';

export function createLogger(env: Env, destination?: DestinationStream): Logger {
  const options = {
    level: env.LOG_LEVEL,
    base: {
      app: 'rehearse',
      version: APP_VERSION,
      commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    },
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'transcript',
      'prompt',
      'output',
      'token',
    ],
  };
  return destination ? pino(options, destination) : pino(options);
}
let logger: Logger | undefined;
export function getLogger(): Logger {
  logger ??= createLogger(getEnv());
  return logger;
}
