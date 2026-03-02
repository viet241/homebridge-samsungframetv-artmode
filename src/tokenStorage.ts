/**
 * Persist Samsung TV tokens by IP.
 * Uses Homebridge storage path from api.user.storagePath() when initStoragePath() is called.
 * Falls back to HOMEBRIDGE_USER_STORAGE_PATH or ~/.homebridge otherwise.
 */
import type { Logging } from 'homebridge';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TOKENS_FILE = 'ezframe-tokens.json';

let storagePathOverride: string | undefined;
let log: Logging | undefined;

/**
 * Initialize storage path from Homebridge API. Call from platform constructor.
 * This ensures tokens are saved in the correct Homebridge directory (Docker, Synology, etc.).
 */
export function initStoragePath(storagePath: string): void {
  storagePathOverride = storagePath;
}

/**
 * Initialize logger for token storage. Call from platform constructor.
 */
export function initLogger(logger: Logging): void {
  log = logger;
}

function getStorageDir(): string {
  if (storagePathOverride) return storagePathOverride;
  const env = process.env.HOMEBRIDGE_USER_STORAGE_PATH;
  if (env) return env;
  return path.join(os.homedir(), '.homebridge');
}

function getTokensPath(): string {
  return path.join(getStorageDir(), TOKENS_FILE);
}

function info(msg: string): void {
  log?.info(msg);
}

function debug(msg: string): void {
  log?.debug(msg);
}

export interface TokenStore {
  [ip: string]: string;
}

export function loadTokens(): TokenStore {
  const p = getTokensPath();
  try {
    const data = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(data) as TokenStore;
    const store = typeof parsed === 'object' && parsed !== null ? parsed : {};
    const count = Object.keys(store).length;
    debug(`[Token] Loaded from ${p}: ${count} token(s) for IP(s): ${Object.keys(store).join(', ') || 'none'}`);
    return store;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debug(`[Token] No tokens file or read failed: ${p} (${msg})`);
    return {};
  }
}

export function saveTokens(store: TokenStore): void {
  const dir = getStorageDir();
  const p = getTokensPath();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    info(`[Token] Created storage dir: ${dir}`);
  }
  fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf-8');
  const count = Object.keys(store).length;
  info(`[Token] Saved to ${p}: ${count} token(s) for IP(s): ${Object.keys(store).join(', ') || 'none'}`);
}

export function getToken(ip: string): string | undefined {
  const store = loadTokens();
  const token = store[ip];
  if (token) {
    debug(`[Token] Found token for ${ip} (length ${token.length})`);
  } else {
    debug(`[Token] No token for ${ip}`);
  }
  return token;
}

export function setToken(ip: string, token: string): void {
  const store = loadTokens();
  store[ip] = token;
  saveTokens(store);
}

export function clearToken(ip: string): void {
  const store = loadTokens();
  delete store[ip];
  saveTokens(store);
  info(`[Token] Cleared token for ${ip}`);
}
