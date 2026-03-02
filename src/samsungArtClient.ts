/**
 * Samsung Frame TV WebSocket client for Art Mode control.
 * Uses the same protocol as EzFrame (Samsung art-app on ports 8001/8002).
 * Supports automatic token request via "Allow on TV" pairing flow.
 */
import * as crypto from 'crypto';
import * as https from 'https';
import WebSocket from 'ws';

const REMOTE_ENDPOINT = 'samsung.remote.control';
const ART_ENDPOINT = 'com.samsung.art-app';
const MS_CHANNEL_READY = 'ms.channel.ready';
const MS_CHANNEL_CONNECT = 'ms.channel.connect';
const MS_CHANNEL_UNAUTHORIZED = 'ms.channel.unauthorized';
const D2D_SERVICE_MESSAGE = 'd2d_service_message';
const CONNECT_TIMEOUT_MS = 30000;

const DEFAULT_AGENT = new https.Agent({ rejectUnauthorized: false });

/** Safely cleanup WebSocket. Do NOT call close/terminate - both throw when connection failed during handshake. */
function safeClose(ws: WebSocket): void {
  try {
    ws.removeAllListeners();
    // Never call close() or terminate() - they throw when connection never established.
    // Socket will GC; when 'close' fired we're already closing.
  } catch { /* ignore */ }
}

/** Normalize WebSocket/library errors (e.g. invalid status code 1005) to a user-friendly Error. */
export function normalizeWsError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message || '';
    if (msg.includes('1005') || msg.includes('Invalid WebSocket frame') || msg.includes('WebSocket closed')) {
      return new Error('TV connection closed or temporarily unavailable');
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
      return new Error('TV unreachable. Check IP and network.');
    }
  }
  return err instanceof Error ? err : new Error(String(err));
}

function base64Encode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64');
}

function createDebug(log?: (msg: string) => void): (msg: string) => void {
  return (msg) => log?.(msg);
}

function getEvent(parsed: Record<string, unknown>): string | undefined {
  return (parsed.event ?? (parsed as { Event?: string }).Event) as string | undefined;
}

function buildChannelPath(
  endpoint: string,
  opts: { name: string; token?: string },
): string {
  const params = new URLSearchParams({ name: base64Encode(opts.name) });
  if (opts.token) params.set('token', opts.token);
  return `/api/v2/channels/${endpoint}?${params}`;
}

async function httpsGet(
  url: string,
  opts: { timeout?: number } = {},
): Promise<string> {
  const { timeout = 8000 } = opts;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent: DEFAULT_AGENT }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

export interface SamsungTVConfig {
  host: string;
  token: string;
}

export interface TvDeviceInfo {
  modelName: string;
  deviceType: string;
  os: string;
  resolution: string;
  networkType: string;
  frameSupport: boolean;
  voiceSupport: boolean;
  tokenAuthSupport: boolean;
  hardwareId: string;
  name?: string;
  model?: string;
  language?: string;
  countryCode?: string;
  powerState?: string;
  firmwareVersion?: string;
  version?: string;
}

/**
 * Get TV device info via HTTPS GET to /api/v2/.
 * No token required - works with just IP.
 */
export async function getTVInfo(
  host: string,
  log?: (msg: string) => void,
): Promise<TvDeviceInfo> {
  const url = `https://${host}:8002/api/v2/`;
  const debug = createDebug(log);
  debug(`Fetching TV info from ${url}`);

  const data = await httpsGet(url);
  const json = JSON.parse(data) as { device?: Record<string, unknown>; version?: string };
  const device = json.device;
  if (!device) {
    throw new Error('No device info in response');
  }
  const getStr = (key: string) =>
    (device[key] != null && typeof device[key] === 'string' ? device[key] : 'Unknown') as string;
  const getBool = (key: string) => String(device[key] || '').toLowerCase() === 'true';
  const getOpt = (key: string) =>
    device[key] != null && typeof device[key] === 'string' ? (device[key] as string) : undefined;

  return {
    modelName: getStr('modelName'),
    deviceType: getStr('type'),
    os: getStr('OS'),
    resolution: getStr('resolution'),
    networkType: getStr('networkType'),
    frameSupport: getBool('FrameTVSupport'),
    voiceSupport: getBool('VoiceSupport'),
    tokenAuthSupport: getBool('TokenAuthSupport'),
    hardwareId: getStr('id'),
    name: getOpt('name'),
    model: getOpt('model'),
    language: getOpt('Language'),
    countryCode: getOpt('countryCode'),
    powerState: getOpt('PowerState'),
    firmwareVersion: getOpt('firmwareVersion'),
    version: (json.version as string) ?? getOpt('version'),
  };
}

/**
 * Request token from TV via pairing flow.
 * Uses samsung.remote.control endpoint - connect without token -> TV shows Allow -> user approves.
 */
export async function requestToken(
  host: string,
  log?: (msg: string) => void,
): Promise<string> {
  const debug = createDebug(log);
  const path = buildChannelPath(REMOTE_ENDPOINT, { name: 'EzFrame Homebridge ' });

  try {
    await httpsGet(`https://${host}:8002/api/v2/`, { timeout: 2000 });
    debug('Sent wake GET to TV');
  } catch {
    /* ignore wake errors */
  }

  return new Promise((resolve, reject) => {
    const url = `wss://${host}:8002${path}`;
    debug(`Connecting to WSS (no token) - TV will show Allow prompt...`);

    const ws = new WebSocket(url, { agent: DEFAULT_AGENT });
    let resolved = false;

    const cleanup = () => safeClose(ws);

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Timeout: TV did not respond. Press Allow on TV within 30 seconds.'));
      }
    }, CONNECT_TIMEOUT_MS);

    ws.on('open', () => debug('Connected, waiting for Allow on TV...'));

    ws.on('message', (data: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(data.toString()) as { event?: string; Event?: string; data?: { token?: string } };
        const event = getEvent(parsed);

        if (event === MS_CHANNEL_UNAUTHORIZED) {
          clearTimeout(timeout);
          resolved = true;
          cleanup();
          reject(new Error('TV rejected. Enable Settings → General → External Device Manager → Device Connect Manager.'));
          return;
        }
        if (event === MS_CHANNEL_CONNECT && parsed?.data?.token) {
          clearTimeout(timeout);
          resolved = true;
          cleanup();
          debug('Token received');
          resolve(parsed.data.token);
        }
      } catch {
        /* ignore parse */
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        reject(new Error('WebSocket closed before receiving token'));
      }
    });
  });
}

export interface ArtModeStatus {
  value: 'on' | 'off';
}

/**
 * Send remote key (e.g. KEY_HOME, KEY_POWER) via samsung.remote.control.
 */
export async function sendKey(
  config: SamsungTVConfig,
  key: string,
  log?: (msg: string) => void,
): Promise<void> {
  const { host, token } = config;
  if (!token) throw new Error('Token required. Run pairing first.');

  const path = buildChannelPath(REMOTE_ENDPOINT, { name: 'EzFrame-Homebridge', token });
  const urls = [`wss://${host}:8002${path}`, `ws://${host}:8001${path}`];
  const debug = createDebug(log);

  await runChannelSession({
    urls,
    debug,
    onUnauthorized: () => new Error('EZFRAME_TOKEN_INVALID: Token expired or rejected.'),
    onReady: (ws) => {
      const payload = {
        method: 'ms.remote.control',
        params: {
          Cmd: 'Click',
          DataOfCmd: key,
          Option: 'false',
          TypeOfRemote: 'SendRemoteKey',
        },
      };
      ws.send(JSON.stringify(payload));
      debug(`Sent ${key}`);
    },
    waitMsAfterReady: 200,
  });
}

/**
 * Connect to art channel, send request, wait for response.
 */
export async function setArtModeStatus(
  config: SamsungTVConfig,
  value: 'on' | 'off',
  log?: (msg: string) => void,
): Promise<void> {
  const requestId = crypto.randomUUID();
  const requestData = { request: 'set_artmode_status', id: requestId, request_id: requestId, value };
  await sendArtRequest(config, requestData, requestId, log);
}

/**
 * Get current Art Mode status from TV.
 */
export async function getArtModeStatus(
  config: SamsungTVConfig,
  log?: (msg: string) => void,
): Promise<'on' | 'off'> {
  const requestId = crypto.randomUUID();
  const requestData = { request: 'get_artmode_status', id: requestId, request_id: requestId };
  const response = await sendArtRequest(config, requestData, requestId, log);
  const value = (response?.value as string) || 'off';
  return value.toLowerCase() === 'on' ? 'on' : 'off';
}

async function sendArtRequest(
  config: SamsungTVConfig,
  requestData: Record<string, unknown>,
  requestId: string,
  log?: (msg: string) => void,
): Promise<Record<string, unknown> | undefined> {
  const { host, token } = config;
  if (!token) {
    throw new Error('Token required. Run pairing first (add TV with IP only, then Allow on TV).');
  }

  const path = buildChannelPath(ART_ENDPOINT, { name: 'EzFrame-Homebridge', token });
  const urls = [`wss://${host}:8002${path}`, `ws://${host}:8001${path}`];
  const debug = createDebug(log);

  return runArtChannelSession({
    urls,
    debug,
    requestData,
    requestId,
  });
}

interface ChannelSessionOpts {
  urls: string[];
  debug: (msg: string) => void;
  onUnauthorized: () => Error;
  onReady: (ws: WebSocket) => void;
  waitMsAfterReady?: number;
}

function runChannelSession(opts: ChannelSessionOpts): Promise<void> {
  const {
    urls,
    debug,
    onUnauthorized,
    onReady,
    waitMsAfterReady = 0,
  } = opts;

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let resolved = false;

    const finish = (err?: Error) => {
      if (resolved) return;
      resolved = true;
      if (ws) safeClose(ws);
      if (err) reject(err);
      else resolve();
    };

    const tryConnect = (urlIndex: number) => {
      const url = urls[urlIndex];
      const isWss = url.startsWith('wss');
      debug(`Connecting to ${isWss ? 'WSS' : 'WS'}...`);

      ws = new WebSocket(url, isWss ? { agent: DEFAULT_AGENT } : {});
      const timeout = setTimeout(() => finish(new Error('Connection timeout')), CONNECT_TIMEOUT_MS);

      ws.on('open', () => debug('Connected, sending...'));

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString()) as Record<string, unknown>;
          const event = getEvent(parsed);

          if (event === MS_CHANNEL_UNAUTHORIZED) {
            clearTimeout(timeout);
            finish(onUnauthorized());
            return;
          }
          if (event === MS_CHANNEL_READY || event === MS_CHANNEL_CONNECT) {
            clearTimeout(timeout);
            if (ws?.readyState === WebSocket.OPEN) {
              onReady(ws);
              if (waitMsAfterReady > 0) {
                setTimeout(() => finish(), waitMsAfterReady);
              } else {
                finish();
              }
            } else {
              finish(new Error('WebSocket not open'));
            }
          }
        } catch { /* ignore */ }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved && urlIndex < urls.length - 1) {
          debug(`Connection failed: ${(err as Error).message}, trying next...`);
          tryConnect(urlIndex + 1);
        } else {
          finish(normalizeWsError(err));
        }
      });

      ws.on('close', () => {
        if (!resolved) finish(normalizeWsError(new Error('WebSocket closed')));
      });
    };

    tryConnect(0);
  });
}

interface ArtChannelSessionOpts {
  urls: string[];
  debug: (msg: string) => void;
  requestData: Record<string, unknown>;
  requestId: string;
}

function runArtChannelSession(opts: ArtChannelSessionOpts): Promise<Record<string, unknown> | undefined> {
  const { urls, debug, requestData, requestId } = opts;

  return new Promise((resolve, reject) => {
    let ws: WebSocket | null = null;
    let resolved = false;

    const finish = (result: Record<string, unknown> | undefined, err?: Error) => {
      if (resolved) return;
      resolved = true;
      if (ws) safeClose(ws);
      if (err) reject(err);
      else resolve(result);
    };

    const sendEmit = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        finish(undefined, new Error('WebSocket not open'));
        return;
      }
      ws.send(JSON.stringify({
        method: 'ms.channel.emit',
        params: {
          event: 'art_app_request',
          to: 'host',
          data: JSON.stringify(requestData),
        },
      }));
      debug('Request sent, waiting for response...');
    };

    const tryConnect = (urlIndex: number) => {
      const url = urls[urlIndex];
      const isWss = url.startsWith('wss');
      debug(`Connecting to ${isWss ? 'WSS' : 'WS'}...`);

      ws = new WebSocket(url, isWss ? { agent: DEFAULT_AGENT } : {});
      const timeout = setTimeout(
        () => finish(undefined, new Error('Connection timeout')),
        CONNECT_TIMEOUT_MS,
      );

      ws.on('open', () => debug('WebSocket connected, waiting for ms.channel.ready...'));

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString()) as { event?: string; Event?: string; data?: string };
          const event = getEvent(parsed);

          if (event === MS_CHANNEL_UNAUTHORIZED) {
            clearTimeout(timeout);
            finish(
              undefined,
              new Error('EZFRAME_TOKEN_INVALID: Token expired or rejected. Re-pair by removing token and trying again.'),
            );
            return;
          }
          if (event === MS_CHANNEL_READY) {
            clearTimeout(timeout);
            debug('Channel ready, sending art request...');
            sendEmit();
            return;
          }
          if (event === D2D_SERVICE_MESSAGE && parsed?.data) {
            const nested = JSON.parse(parsed.data) as Record<string, unknown>;
            const msgId = (nested.request_id ?? nested.id) as string;
            if (msgId === requestId) {
              clearTimeout(timeout);
              finish(nested);
            }
          }
        } catch { /* ignore */ }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        if (!resolved && urlIndex < urls.length - 1) {
          debug(`Connection failed: ${(err as Error).message}, trying next...`);
          tryConnect(urlIndex + 1);
        } else {
          finish(undefined, normalizeWsError(err));
        }
      });

      ws.on('close', () => {
        if (!resolved) finish(undefined, normalizeWsError(new Error('WebSocket closed before response')));
      });
    };

    tryConnect(0);
  });
}
