# EzFrame – Samsung Frame TV Art Mode (Homebridge)

Control **Samsung Frame TV Art Mode** from Apple Home, Shortcuts, and Siri via [Homebridge](https://homebridge.io).

Each TV appears as a switch in the Home app. Turn Art Mode on or off with one tap or by asking Siri.

---

## Requirements

- **Node.js** `^20.18.0`, `^22.10.0`, or `^24.0.0`
- **Homebridge** `^1.8.0` or `^2.0.0`
- Samsung Frame TV (2017 or newer with Art Mode) on the same network

---

## Installation

### From npm (recommended)

```bash
sudo npm install -g homebridge-ezframe-samsungframetv-artmode
```

### From packed file (tgz)

If you use a pre-built package (e.g. from [GitHub Releases](https://github.com/viet241/homebridge-samsungframetv-artmode/releases)):

```bash
sudo npm install -g ./homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz
```

See [install-guide.md](./install-guide.md) for Docker, NAS, and first-time pairing.

---

## Configuration

Add the platform to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "EzFrame Homebridge",
      "name": "EzFrame Homebridge",
      "tvs": [
        { "ip": "192.168.1.100" }
      ]
    }
  ]
}
```

- **`platform`** must be exactly `"EzFrame Homebridge"`.
- **`tvs`** – array of TVs. Each entry needs at least **`ip`** (your TV’s local IP).

**First use:** The TV will show an **Allow** prompt. Press **Allow** once; the plugin saves the token and won’t ask again.

### Optional: custom switch name

```json
"switchNames": {
  "artMode": "Art Mode"
}
```

Default is `"Art Mode"`. The displayed name in Home will be **TV name + this suffix** (e.g. “The Frame Art Mode”).

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

## Links

- **npm:** [homebridge-ezframe-samsungframetv-artmode](https://www.npmjs.com/package/homebridge-ezframe-samsungframetv-artmode)
- **Repository:** [viet241/homebridge-samsungframetv-artmode](https://github.com/viet241/homebridge-samsungframetv-artmode)
- **Issues:** [GitHub Issues](https://github.com/viet241/homebridge-samsungframetv-artmode/issues)

---

## License

Apache-2.0
