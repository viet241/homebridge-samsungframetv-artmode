import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import type { SamsungTVConfig } from './samsungArtClient.js';
import { requestToken, getTVInfo } from './samsungArtClient.js';
import { EzFrameAccessory } from './platformAccessory.js';
import { DEFAULT_SWITCH_NAMES, PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { clearToken, getToken, initLogger, initStoragePath, setToken } from './tokenStorage.js';

export interface TVConfig {
  ip: string;
  name?: string;
}

export interface SwitchNames {
  artMode?: string;
}

export interface EzFramePlatformConfig extends PlatformConfig {
  name: string;
  switchNames?: SwitchNames;
  tvs?: Array<{ ip: string; name?: string } | string>;
}

/**
 * EzFrame Homebridge Platform
 * Registers Samsung Frame TVs as accessories with Art Mode switch.
 */
export class EzFrameHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  private discoveredCacheUUIDs: string[] = [];
  private pairingByIP: Map<string, Promise<SamsungTVConfig>> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    const storagePath = api.user.storagePath();
    initStoragePath(storagePath);
    initLogger(log);
    this.log.info(`[EzFrame] Token storage: ${storagePath}/ezframe-tokens.json`);

    this.log.debug('EzFrame platform initialized:', (config as EzFramePlatformConfig).name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('didFinishLaunching');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * Resolve token for TV: config > storage > request via pairing.
   * Call before any art API; may throw if pairing fails.
   * Deduplicates concurrent pairing requests per IP to avoid Allow spam.
   */
  async ensureTokenForTV(tv: TVConfig): Promise<SamsungTVConfig> {
    const token = getToken(tv.ip);
    if (token) {
      return { host: tv.ip, token };
    }
    const existing = this.pairingByIP.get(tv.ip);
    if (existing) {
      return existing;
    }
    const label = tv.name ?? tv.ip;
    this.log.info(`[${label}] No token. Requesting pairing - press Allow on TV...`);
    const pairingPromise = requestToken(tv.ip, (m) => this.log.debug(`[${label}] ${m}`))
      .then((newToken) => {
        setToken(tv.ip, newToken);
        this.log.info(`[${label}] Paired successfully, token saved`);
        return { host: tv.ip, token: newToken };
      })
      .finally(() => {
        this.pairingByIP.delete(tv.ip);
      });
    this.pairingByIP.set(tv.ip, pairingPromise);
    return pairingPromise;
  }

  clearTokenForIP(ip: string): void {
    clearToken(ip);
  }

  getSwitchNames(cfg?: EzFramePlatformConfig): { artMode: string } {
    const custom = cfg?.switchNames;
    return {
      artMode: custom?.artMode?.trim() || DEFAULT_SWITCH_NAMES.artMode,
    };
  }

  discoverDevices(): void {
    const cfg = this.config as EzFramePlatformConfig;
    const tvs = cfg.tvs ?? [];

    if (tvs.length === 0) {
      this.log.warn('No TVs configured. Add TVs with name and IP in config.');
    }

    for (const item of tvs) {
      const ip = typeof item === 'string' ? item : item?.ip;
      if (!ip || typeof ip !== 'string') {
        this.log.warn('Skip TV: missing ip');
        continue;
      }

      const tv: TVConfig = { ip: ip.trim() };
      if (typeof item === 'object' && item?.name) {
        tv.name = String(item.name).trim();
      }

      const uuid = this.api.hap.uuid.generate(`ezframe-${tv.ip}`);
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        this.log.info('Restoring accessory:', existingAccessory.displayName);
        if (!tv.name) tv.name = existingAccessory.displayName;
        existingAccessory.context.tv = tv;
        existingAccessory.context.switchNames = this.getSwitchNames(cfg);
        new EzFrameAccessory(this, existingAccessory);
      } else {
        void this.resolveAndAddAccessory(tv, uuid);
      }
      this.discoveredCacheUUIDs.push(uuid);
    }

    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private async resolveAndAddAccessory(tv: TVConfig, uuid: string): Promise<void> {
    let name = tv.name;
    if (!name) {
      try {
        const info = await getTVInfo(tv.ip, (m) => this.log.debug(m));
        name = info.name ?? info.modelName ?? `Samsung Frame (${tv.ip})`;
      } catch {
        name = `Samsung Frame (${tv.ip})`;
      }
    }
    tv.name = name;
    this.log.info('Adding accessory:', name);
    const accessory = new this.api.platformAccessory(name, uuid);
    accessory.context.tv = tv;
    accessory.context.switchNames = this.getSwitchNames(this.config as EzFramePlatformConfig);
    new EzFrameAccessory(this, accessory);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }
}
