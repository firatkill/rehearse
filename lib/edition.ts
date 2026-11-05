/** Validated with Zod by next.config.ts, then replaced at build time. */
const edition = process.env.NEXT_PUBLIC_APP_EDITION ?? 'full';
if (edition !== 'demo' && edition !== 'full') throw new Error('Invalid public edition');
export const APP_EDITION = edition;
