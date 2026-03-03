# EzFrame – Samsung Frame TV Art Mode (Homebridge)

Control **Samsung Frame TV Art Mode** from Apple Home, Shortcuts, and Siri via [Homebridge](https://homebridge.io).

You get **one simple switch** for Art Mode — no SmartThings, no extra features. Setting up Art Mode via SmartThings is much more involved; here you only need your TV’s **IP address** and **one tap on Allow** on the TV when prompted.

One switch per TV in the Home app — tap it or say “Hey Siri” to turn Art Mode on or off.

---

## EzFrame Desktop App

This plugin works alongside **[EzFrame](https://ezframe.viet241.com)** — a free desktop app (macOS, Windows, Linux) to manage art on your Samsung The Frame TV from your computer: upload images, browse and set art, and control the TV with hotkeys. If you use a Samsung Frame TV, check it out: [ezframe.viet241.com](https://ezframe.viet241.com).

---

## Requirements

- **Node.js** `^20.18.0` or later
- **Homebridge** `^1.8.0` or later
- Samsung The Frame TV 2024 or newer with Art Mode is recommended (older devices have not been tested)

---

## Installation

### Via Homebridge UI (easiest)

If you use **Homebridge Config UI X** (web interface):

1. Open the Homebridge UI (e.g. http://homebridge.local:8581).
2. Go to **Plugins** → **Search** (or **Plugins** → **Discover**).
3. Search for **homebridge-ezframe-samsungframetv-artmode**.
4. Click **Install**, then restart Homebridge when prompted.

### From npm (command line)

The plugin is published on [npm](https://www.npmjs.com/package/homebridge-ezframe-samsungframetv-artmode). One command installs it — **no .tgz file needed**:

```bash
npm install -g homebridge-ezframe-samsungframetv-artmode
```

### From packed file (.tgz) — optional

Only if you can’t use the npm registry (e.g. offline, or you want a specific build from [GitHub Releases](https://github.com/viet241/homebridge-samsungframetv-artmode/releases)):

```bash
npm install -g ./homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz
```

Configuration (platform, TVs, optional switch name) can be done via the **Homebridge UI** or by editing `config.json`. You **must** press **Allow** on the TV when prompted, and using a **static IP** for the TV is recommended. See [install-guide.md](./install-guide.md) for configuration steps and first-time pairing.

---

## Usage

- Each TV gets one **Art Mode** switch in the Home app.
- Use the Home app, Siri, or Shortcuts to turn Art Mode on or off.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **“No plugin was found for the platform”** | Reinstall the plugin where Homebridge runs (e.g. `npm install -g homebridge-ezframe-samsungframetv-artmode` or install the `.tgz` in the same environment). Restart Homebridge. |
| **Broken bridge icon** | Check Homebridge logs for errors (plugin crash or load failure). |
| **TV not responding** | Ensure the TV is on the same network, IP is correct, and you’ve accepted **Allow** on the TV. |

---

## Support

This project is completely free to use. If you find this plugin useful for your The Frame TV, consider supporting my efforts:

<a href="https://ko-fi.com/viet241" target="_blank" rel="noopener noreferrer">
  <img
    height="36"
    style="border: 0px; height: 36px;"
    src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
    alt="Buy Me a Coffee at ko-fi.com"
  />
</a>

---

## Links

- **npm:** [homebridge-ezframe-samsungframetv-artmode](https://www.npmjs.com/package/homebridge-ezframe-samsungframetv-artmode)
- **Repository:** [viet241/homebridge-samsungframetv-artmode](https://github.com/viet241/homebridge-samsungframetv-artmode)
- **Issues:** [GitHub Issues](https://github.com/viet241/homebridge-samsungframetv-artmode/issues)

---

## License

Apache-2.0
