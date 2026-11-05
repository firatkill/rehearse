// Next runs this synchronous entry before hydration. Zod supports pre-seeding its
// shared config; disable its caught Function() capability probe under strict CSP.
const runtime = globalThis as typeof globalThis & {
  __zod_globalConfig?: { jitless?: boolean };
};
runtime.__zod_globalConfig ??= {};
runtime.__zod_globalConfig.jitless = true;
export {};
