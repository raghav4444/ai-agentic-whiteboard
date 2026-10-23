/**
 * Server instrumentation.
 *
 * `register` runs once per server instance, before the first request is
 * handled. Next.js calls it in EVERY runtime, so anything that only works on
 * Node has to be imported dynamically behind a `NEXT_RUNTIME` check — otherwise
 * the Edge bundle tries to include `node:dns` / `node:net` and fails to build.
 *
 * See `lib/db-networking.ts` for what the Node-only setup does and why.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupDatabaseNetworking } = await import('./lib/db-networking');
    await setupDatabaseNetworking();
  }
}
