/**
 * Outbound networking setup for the database.
 *
 * Node-only. Imported dynamically from `instrumentation.ts` so the Edge runtime
 * bundle never pulls in `node:dns` / `node:net`.
 *
 * WHY THIS EXISTS
 *
 * Outbound connections to the database fail on hosts where IPv6 is advertised
 * in DNS but not actually routable — a common configuration for cloud
 * databases behind a connection pooler. Node's happy-eyeballs algorithm (on by
 * default since Node 20) races the IPv6 and IPv4 candidates, but a black-holed
 * IPv6 SYN does not fail fast: it hangs, so the whole connect times out
 * instead of falling back to the reachable IPv4 address.
 *
 * The symptom is a bare `ETIMEDOUT` with an empty message, which is close to
 * undiagnosable if you do not know to look for it. The same host reached with
 * `family: 4` connects in ~300ms.
 *
 * So we probe: if IPv6 to the database host is not actually usable, we ask
 * Node to prefer IPv4 and stop racing. On a healthy network the probe
 * succeeds, nothing changes, and happy-eyeballs keeps its benefit.
 */

import dns from 'node:dns';
import net from 'node:net';

const PROBE_TIMEOUT_MS = 1500;
const PROBE_PORT = 443;

/** The hostname the app talks to for data, if one is configured. */
function databaseHost(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Can we open a TCP connection over IPv6 to this host? */
function ipv6Reachable(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: PROBE_PORT, family: 6 });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

/**
 * Prefer IPv4 and stop happy-eyeballs racing.
 *
 * `setDefaultResultOrder` only affects plain `dns.lookup`; the auto-select
 * family logic resolves addresses separately and ignores it, which is why both
 * calls are needed.
 */
function applyIpv4Preference(): void {
  dns.setDefaultResultOrder('ipv4first');
  net.setDefaultAutoSelectFamily(false);
}

export async function setupDatabaseNetworking(): Promise<void> {
  const host = databaseHost();
  if (!host) return;

  // Only worth probing if the host even advertises an IPv6 address. If it does
  // not, there is no race to lose and happy-eyeballs keeps its benefit.
  const addresses: Array<{ address: string; family: number }> =
    await dns.promises.lookup(host, { all: true });
  if (!addresses.some((a) => a.family === 6)) return;

  if (await ipv6Reachable(host)) return;

  applyIpv4Preference();
  console.info(
    '[instrumentation] IPv6 to the database host is not reachable; preferring IPv4.',
  );
}
