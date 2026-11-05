import { z } from 'zod';
/** Sole public env value; replaced at build time from APP_EDITION by next.config.ts. */
export const APP_EDITION = z
  .enum(['demo', 'full'])
  .parse(process.env.NEXT_PUBLIC_APP_EDITION ?? 'full');
