#!/usr/bin/env node
/**
 * Standalone test script for Samsung Frame TV.
 * Run: npx tsx scripts/test-tv.ts <ip> <command>
 * Commands: info | pair | status | on | off | home | power
 *
 * Example:
 *   npx tsx scripts/test-tv.ts 192.168.68.113 info      - Get TV device info
 *   npx tsx scripts/test-tv.ts 192.168.68.113 pair      - Pair (press Allow on TV)
 *   npx tsx scripts/test-tv.ts 192.168.68.113 status    - Get Art Mode status
 *   npx tsx scripts/test-tv.ts 192.168.68.113 on       - Set Art Mode on
 *   npx tsx scripts/test-tv.ts 192.168.68.113 off      - Set Art Mode off
 *   npx tsx scripts/test-tv.ts 192.168.68.113 home     - Send Home key
 *   npx tsx scripts/test-tv.ts 192.168.68.113 power      - Send Power key (toggle on/off)
 */
import * as fs from 'fs';
import * as path from 'path';
import {
    getTVInfo,
    getArtModeStatus,
    setArtModeStatus,
    requestToken,
    sendKey,
    type TvDeviceInfo,
} from '../src/samsungArtClient.js';

const TOKENS_FILE = path.join(process.cwd(), 'ezframe-tokens.json');

function loadTokens(): Record<string, string> {
    try {
        const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

function saveToken(ip: string, token: string): void {
    const store = loadTokens();
    store[ip] = token;
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function getToken(ip: string): string | undefined {
    return loadTokens()[ip];
}

function log(msg: string): void {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function printTVInfo(info: TvDeviceInfo): void {
    console.log('\n--- TV Device Info ---');
    console.log('Name:          ', info.name ?? info.modelName);
    console.log('Model:         ', info.model ?? info.modelName);
    console.log('Device Type:   ', info.deviceType);
    console.log('OS:            ', info.os);
    console.log('Resolution:    ', info.resolution);
    console.log('Frame Support: ', info.frameSupport);
    console.log('Power State:   ', info.powerState ?? 'unknown');
    console.log('Hardware ID:   ', info.hardwareId);
    console.log('------------------------\n');
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(`
EzFrame TV Test Script
Usage: npx tsx scripts/test-tv.ts <ip> <command>

Commands:
  info      - Get TV device info (no token needed)
  pair      - Pair with TV (press Allow on TV when prompted)
  status    - Get Art Mode status (requires token; run 'pair' first)
  on        - Turn Art Mode on
  off       - Turn Art Mode off
  home      - Send Home key (go to home screen)
  power     - Send Power key (toggle TV on/off)

Example:
  npx tsx scripts/test-tv.ts 192.168.68.113 info
  npx tsx scripts/test-tv.ts 192.168.68.113 pair
  npx tsx scripts/test-tv.ts 192.168.68.113 status
`);
        process.exit(1);
    }

    const [ip, cmd] = args;
    const command = cmd.toLowerCase();

    try {
        switch (command) {
            case 'info': {
                log('Fetching TV info...');
                const info = await getTVInfo(ip, log);
                printTVInfo(info);
                break;
            }
            case 'pair': {
                log('Requesting pairing - press Allow on TV...');
                const token = await requestToken(ip, log);
                saveToken(ip, token);
                log(`Paired successfully. Token saved to ${TOKENS_FILE}`);
                break;
            }
            case 'status': {
                let token = getToken(ip);
                if (!token) {
                    log('No token. Pairing first - press Allow on TV...');
                    token = await requestToken(ip, log);
                    saveToken(ip, token);
                }
                const status = await getArtModeStatus({ host: ip, token }, log);
                log(`Art Mode: ${status}`);
                break;
            }
            case 'on':
            case 'off': {
                const value = command as 'on' | 'off';
                let token = getToken(ip);
                if (!token) {
                    log('No token. Pairing first - press Allow on TV...');
                    token = await requestToken(ip, log);
                    saveToken(ip, token);
                }
                log(`Setting Art Mode ${value}...`);
                await setArtModeStatus({ host: ip, token }, value, log);
                log(`Art Mode set to ${value}`);
                break;
            }
            case 'home': {
                let token = getToken(ip);
                if (!token) {
                    log('No token. Pairing first - press Allow on TV...');
                    token = await requestToken(ip, log);
                    saveToken(ip, token);
                }
                log('Sending Home key...');
                await sendKey({ host: ip, token }, 'KEY_HOME', log);
                log('Home sent');
                break;
            }
            case 'power': {
                let token = getToken(ip);
                if (!token) {
                    log('No token. Pairing first - press Allow on TV...');
                    token = await requestToken(ip, log);
                    saveToken(ip, token);
                }
                log('Sending Power key (toggle)...');
                await sendKey({ host: ip, token }, 'KEY_POWER', log);
                log('Power key sent');
                break;
            }
            default:
                console.error(`Unknown command: ${cmd}`);
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', (err as Error).message);
        process.exit(1);
    }
}

main();
