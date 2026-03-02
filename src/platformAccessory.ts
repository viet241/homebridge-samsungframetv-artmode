import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import { getArtModeStatus, normalizeWsError, setArtModeStatus } from './samsungArtClient.js';
import type { EzFrameHomebridgePlatform } from './platform.js';
import type { TVConfig } from './platform.js';
import { DEFAULT_SWITCH_NAMES } from './settings.js';

/**
 * Samsung Frame TV accessory - Art Mode switch only.
 */
export class EzFrameAccessory {
  private readonly artService: Service;
  private artModeOn = false;

  constructor(
    private readonly platform: EzFrameHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const tv = accessory.context.tv as TVConfig;
    if (!tv?.ip) {
      throw new Error('TV config missing');
    }
    const displayName = tv.name ?? tv.ip;
    const names = (accessory.context.switchNames as Record<string, string>) ?? DEFAULT_SWITCH_NAMES;

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Samsung')
      .setCharacteristic(this.platform.Characteristic.Model, 'The Frame')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, tv.ip);

    const artName = `${displayName} ${names.artMode ?? DEFAULT_SWITCH_NAMES.artMode}`;
    this.artService =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch, artName);
    this.artService.setCharacteristic(this.platform.Characteristic.Name, artName);
    this.artService
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setArtOn.bind(this))
      .onGet(this.getArtOn.bind(this));

    this.removeLegacyServices();

    this.updateStatus().catch((err) => {
      this.platform.log.warn('Initial status fetch failed:', normalizeWsError(err).message);
      this.artModeOn = false;
      this.artService.updateCharacteristic(this.platform.Characteristic.On, false);
    });
  }

  private removeLegacyServices(): void {
    for (const subType of ['Home', 'Power', 'PowerOff']) {
      const id = this.platform.api.hap.uuid.generate(`ezframe-${subType}-${this.accessory.UUID}`);
      const svc = this.accessory.getServiceById(this.platform.Service.Switch, id);
      if (svc) this.accessory.removeService(svc);
    }
  }

  private async getConfig(): Promise<{ host: string; token: string }> {
    const tv = this.accessory.context.tv as TVConfig;
    return this.platform.ensureTokenForTV(tv);
  }

  private log(msg: string): void {
    this.platform.log.debug(`[${this.accessory.displayName}] ${msg}`);
  }

  private async updateStatus(): Promise<void> {
    const tv = this.accessory.context.tv as TVConfig;
    try {
      const artStatus = await this.execWithTokenRetry((config) =>
        getArtModeStatus(config, (m) => this.log(m)),
      );
      this.artModeOn = artStatus === 'on';
      this.artService.updateCharacteristic(this.platform.Characteristic.On, this.artModeOn);
    } catch (err) {
      this.platform.log.warn('Art Mode status unavailable:', normalizeWsError(err).message);
      this.artModeOn = false;
      this.artService.updateCharacteristic(this.platform.Characteristic.On, false);
    }
  }

  async setArtOn(value: CharacteristicValue): Promise<void> {
    const on = value as boolean;
    const status = on ? 'on' : 'off';

    this.platform.log.info(`Setting Art Mode ${status}...`);

    try {
      await this.execWithTokenRetry(async (config) => {
        await setArtModeStatus(config, status, (m) => this.log(m));
      });
      this.artModeOn = on;
      this.platform.log.info(`Art Mode ${status}`);
    } catch (err) {
      this.platform.log.error('Failed to set Art Mode:', (err as Error).message);
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  async getArtOn(): Promise<CharacteristicValue> {
    try {
      const status = await this.execWithTokenRetry((config) =>
        getArtModeStatus(config, (m) => this.log(m)),
      );
      this.artModeOn = status === 'on';
      return this.artModeOn;
    } catch (err) {
      this.platform.log.warn('Art Mode status unavailable:', normalizeWsError(err).message);
      this.artModeOn = false;
      this.artService.updateCharacteristic(this.platform.Characteristic.On, false);
      return false;
    }
  }

  /**
   * Execute art API with token. On EZFRAME_TOKEN_INVALID, clear token and retry once (re-pair).
   */
  private async execWithTokenRetry<T>(
    fn: (config: { host: string; token: string }) => Promise<T>,
  ): Promise<T> {
    const tv = this.accessory.context.tv as TVConfig;
    let config = await this.getConfig();
    try {
      return await fn(config);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('EZFRAME_TOKEN_INVALID')) {
        this.platform.clearTokenForIP(tv.ip);
        this.platform.log.info(`[${tv.name ?? tv.ip}] Token invalid, re-pairing...`);
        config = await this.getConfig();
        return fn(config);
      }
      throw err;
    }
  }
}
