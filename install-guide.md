# EzFrame Homebridge Plugin – Install Guide

Step-by-step installation for **homebridge-ezframe-samsungframetv-artmode**.

---

## 1. Install via Homebridge UI (easiest)

If you run **Homebridge Config UI X** (the web interface):

1. Open the Homebridge UI in your browser (e.g. `http://homebridge.local:8581` or your Homebridge URL).
2. Go to **Plugins** (or **Plugins** → **Search** / **Discover**).
3. In the search box, type **EzFrame** or **samsung frame art**.
4. Find **EzFrame - Switch Art Mode for Samsung Frame TV** (or `homebridge-ezframe-samsungframetv-artmode`).
5. Click **Install** and wait for the installation to finish.
6. Restart Homebridge when prompted (or from the UI: **Settings** → restart).

After that, add the platform and your TV(s) in **Plugins** → your plugin → **Settings**, or in **Config** (see section 5).

---

## 2. Install via Homebridge Terminal (hb-service add)

If you use **Homebridge Config UI X** and open the built-in **Terminal** (same environment as the service), you can install the plugin with:

```bash
hb-service add homebridge-ezframe-samsungframetv-artmode
```

To remove it later:

```bash
hb-service remove homebridge-ezframe-samsungframetv-artmode
```

Then add the platform and TV(s) in the UI or config (see section 5), and restart Homebridge if needed.

---

## 3. Install from npm (command line)
On the machine where Homebridge runs:

```bash
npm install -g homebridge-ezframe-samsungframetv-artmode
```

Then restart Homebridge.

---

## 4. Install from a packed file (.tgz) — optional

Use this only when you can’t use the npm registry (e.g. air-gapped, or you want a specific build from GitHub Releases).

### 3.1 Get the package file

- Download `homebridge-ezframe-samsungframetv-artmode-<version>.tgz` from [GitHub Releases](https://github.com/viet241/homebridge-samsungframetv-artmode/releases), or
- Build it yourself: in the plugin folder run `npm run build && npm pack`.

### 3.2 Install the .tgz

**Same machine as Homebridge:**

```bash
cd /path/to/folder/containing/the-tgz-file
npm install -g ./homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz
```

Replace `1.0.1` with your version. Then restart Homebridge.

---


## 5. Configuration

**Note:** You **must** press **Allow** on the TV when it prompts (first connection); otherwise the plugin cannot talk to the TV. Using a **static IP** for your Frame TV is recommended so the plugin can reach it reliably (set via your router or the TV’s network settings).

You can set up the plugin via the **Homebridge UI** (recommended) or by editing `config.json` manually.

**Via Homebridge UI:** In **Plugins** → **EzFrame Homebridge**, add the platform and your TV(s) by **IP address**. Optionally set a custom **Art Mode** switch name. Save and restart; on first use, press **Allow** on the TV.

**Manual config (config.json):** Edit Homebridge `config.json` (path depends on your setup):

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

Replace `192.168.1.100` with your Samsung Frame TV’s IP.

**Optional: custom switch name**

```json
"switchNames": {
  "artMode": "Art Mode"
}
```

Default is `"Art Mode"`. The displayed name in Home will be **TV name + this suffix** (e.g. “The Frame Art Mode”).

---

## 6. First-time pairing

1. Save the config and restart Homebridge.
2. When the plugin talks to the TV for the first time, the TV will show **Allow** / **Deny**.
3. You **must** press **Allow** on the TV. The plugin stores the token (e.g. in `ezframe-tokens.json` next to the Homebridge config) and won’t ask again. If you miss it, restart Homebridge and watch the TV for the prompt again.

After that, the **Art Mode** switch for that TV should appear in the Home app.

---

## 7. Optional: build and pack locally

From the plugin source directory:

```bash
cd ezframe-homebridge-plugin
npm ci
npm run build
npm pack
```

You’ll get `homebridge-ezframe-samsungframetv-artmode-<version>.tgz`. Install it with:

```bash
npm install -g ./homebridge-ezframe-samsungframetv-artmode-<version>.tgz
```

