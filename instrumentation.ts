/** Validate server configuration before accepting requests; no provider is constructed. */
export async function register() {
  const { getEnv } = await import('@/lib/env');
  getEnv();
}
