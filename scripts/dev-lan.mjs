// Canonical source. Copy with scripts/sync-dev-lan.py; project copies are standalone.
import { spawn, execFileSync } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { fileURLToPath } from 'node:url';
import { parseArgs, stripVTControlCharacters } from 'node:util';

export function selectLanAddress(interfaces, { interfaceName, address, preferredInterface } = {}) {
  const entries = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter(({ family, internal, address }) => family === 'IPv4' && !internal && !address.startsWith('169.254.'))
      .map(({ address }) => ({ name, address })),
  );
  if (address || interfaceName) {
    const match = entries.find(entry => (!address || entry.address === address) && (!interfaceName || entry.name === interfaceName));
    if (!match) throw new Error('DEV_LAN_IP / DEV_LAN_INTERFACE must select an assigned non-loopback IPv4 address.');
    return match.address;
  }
  const preferred = entries.find(entry => entry.name === preferredInterface);
  if (preferred) return preferred.address;
  const physical = entries.filter(({ name }) => /^(en\d+|eth\d+|wlan\d+|enp\w+|wlp\w+|Wi-Fi|Ethernet)$/.test(name));
  const candidates = physical.length ? physical : entries;
  if (candidates.length === 1) return candidates[0].address;
  if (!candidates.length) throw new Error('Connect to Wi-Fi or Ethernet before running dev:lan.');
  throw new Error(`Multiple network addresses are available; set DEV_LAN_INTERFACE or DEV_LAN_IP (${candidates.map(({ name, address }) => `${name}: ${address}`).join(', ')}).`);
}

function defaultInterface() {
  if (process.platform !== 'darwin') return undefined;
  try {
    return execFileSync('/sbin/route', ['-n', 'get', 'default'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .match(/interface:\s*(\S+)/)?.[1];
  } catch {
    return undefined;
  }
}

export async function checkLoopbackPort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}

// Forward bytes unchanged, including WebSocket upgrades, Host and Origin headers.
export async function startLanProxy({ host, port, upstreamPort = port }) {
  const sockets = new Set();
  const server = createServer({ allowHalfOpen: true }, client => {
    const upstream = createConnection({ host: '127.0.0.1', port: upstreamPort, allowHalfOpen: true });
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    }
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
    // A peer closing before its response arrives must not leave an upstream open.
    client.once('close', () => upstream.destroy());
    upstream.once('close', () => client.destroy());
    client.pipe(upstream).pipe(client);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host, port, exclusive: true }, resolve);
  });
  return {
    server,
    close() {
      for (const socket of sockets) socket.destroy();
      return new Promise(resolve => server.close(resolve));
    },
  };
}

export function filterAddressLine(line) {
  const plain = stripVTControlCharacters(line);
  return /^\s*(?:-\s*|➜\s*)?(?:Local|Network):\s/.test(plain) ? '' : line;
}

function forwardOutput(source, destination) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  source.on('data', chunk => {
    pending += decoder.write(chunk);
    let newline;
    while ((newline = pending.indexOf('\n')) !== -1) {
      destination.write(filterAddressLine(pending.slice(0, newline + 1)));
      pending = pending.slice(newline + 1);
    }
  });
  source.on('end', () => destination.write(filterAddressLine(pending + decoder.end())));
}

export async function main(args = process.argv.slice(2)) {
  const separator = args.indexOf('--');
  if (separator === -1) throw new Error('Usage: node scripts/dev-lan.mjs --port PORT [--local-url URL] -- COMMAND [ARGS]');
  const { values } = parseArgs({
    args: args.slice(0, separator),
    options: { port: { type: 'string' }, 'local-url': { type: 'string' }, 'loopback-preload': { type: 'string' } },
  });
  const port = Number(values.port);
  const [command, ...commandArgs] = args.slice(separator + 1);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || !command) throw new Error('Provide a fixed port between 1024 and 65535 and a development command.');
  const host = selectLanAddress(networkInterfaces(), {
    interfaceName: process.env.DEV_LAN_INTERFACE,
    address: process.env.DEV_LAN_IP,
    preferredInterface: defaultInterface(),
  });
  const localUrl = new URL(values['local-url'] ?? `http://127.0.0.1:${port}`);
  const path = (localUrl.pathname === '/' ? '' : localUrl.pathname) + localUrl.search + localUrl.hash;
  // Fail before launching any child when either required address is occupied.
  await checkLoopbackPort(port);
  const proxy = await startLanProxy({ host, port });
  const env = { ...process.env };
  if (values['loopback-preload']) {
    const preload = resolve(values['loopback-preload']);
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --require ${JSON.stringify(preload)}`.trim();
  }
  if (process.stdout.isTTY && !('NO_COLOR' in env)) env.FORCE_COLOR ??= '1';
  console.log(`- Local:         ${values['local-url'] ?? `http://127.0.0.1:${port}`}`);
  console.log(`- Network:       http://${host}:${port}${path}`);

  const child = spawn(command, commandArgs, { env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
  // Read input in the foreground parent: a detached group cannot read the TTY.
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') throw error; });
  process.stdin.pipe(child.stdin);
  forwardOutput(child.stdout, process.stdout);
  forwardOutput(child.stderr, process.stderr);
  let stopping = false;
  let forcedShutdown;
  function signalGroup(signal) {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  function stop(signal) {
    if (stopping) return;
    stopping = true;
    void proxy.close();
    signalGroup(signal);
    forcedShutdown = setTimeout(() => signalGroup('SIGKILL'), 5000);
    forcedShutdown.unref();
  }
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(signal, () => stop(signal));
  child.once('error', error => {
    console.error(`dev:lan: ${error.message}`);
    stop('SIGTERM');
    process.exitCode = 1;
  });
  child.once('close', (code, signal) => {
    process.stdin.unpipe(child.stdin);
    process.stdin.pause();
    clearTimeout(forcedShutdown);
    // A framework CLI may exit before its descendants; clean up only our group.
    signalGroup('SIGTERM');
    const deadline = Date.now() + 5000;
    function reapGroup() {
      if (!child.pid) return;
      try { process.kill(-child.pid, 0); } catch (error) { if (error.code === 'ESRCH') return; throw error; }
      if (Date.now() >= deadline) signalGroup('SIGKILL');
      else setTimeout(reapGroup, 50);
    }
    reapGroup();
    if (!stopping) void proxy.close();
    process.exitCode ??= code ?? (signal === 'SIGINT' ? 130 : 1);
  });
  proxy.server.on('error', error => {
    console.error(`dev:lan: ${error.message}`);
    process.exitCode = 1;
    stop('SIGTERM');
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`dev:lan: ${error.message}`);
    process.exitCode = 1;
  });
}
