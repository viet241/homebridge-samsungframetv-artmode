/**
 * Platform name for Homebridge config (must match config.json "platform" field)
 */
export const PLATFORM_NAME = 'EzFrame Homebridge';

/**
 * Plugin name - must match package.json
 */
export const PLUGIN_NAME = 'homebridge-ezframe-samsungframetv-artmode';

/**
 * Default switch label (suffix after TV name).
 * Config can override via switchNames.artMode.
 */
export const DEFAULT_SWITCH_NAMES = {
  artMode: 'Art Mode',
} as const;
