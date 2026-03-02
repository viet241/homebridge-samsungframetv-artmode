# EzFrame Homebridge Plugin – Install Guide

Step-by-step installation for **homebridge-ezframe-samsungframetv-artmode**.

---

## 1. Install from npm (recommended)

On the machine where Homebridge runs:

```bash
sudo npm install -g homebridge-ezframe-samsungframetv-artmode
```

Then restart Homebridge (e.g. `sudo systemctl restart homebridge` or restart from the Homebridge UI).

---

## 2. Install from a packed file (.tgz)

Use this when you don’t use npm (e.g. air-gapped or you use a build from GitHub Releases).

### 2.1 Get the package file

- Download `homebridge-ezframe-samsungframetv-artmode-<version>.tgz` from [GitHub Releases](https://github.com/viet241/homebridge-samsungframetv-artmode/releases), or
- Build it yourself: in the plugin folder run `npm run build && npm pack`.

### 2.2 Install the .tgz

**Same machine as Homebridge:**

```bash
cd /path/to/folder/containing/the-tgz-file
sudo npm install -g ./homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz
```

Replace `1.0.1` with your version. Then restart Homebridge.

---

## 3. Install on Docker (e.g. Homebridge on NAS)

If Homebridge runs in Docker (e.g. `oznu/homebridge`):

1. Copy the `.tgz` into the container (e.g. into `/homebridge/`):

   ```bash
   docker cp homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz homebridge:/homebridge/
   ```

   Use your actual container name if it’s not `homebridge`.

2. Install inside the container:

   ```bash
   docker exec -it homebridge sh -c "cd /homebridge && npm install ./homebridge-ezframe-samsungframetv-artmode-1.0.1.tgz"
   ```

3. Restart the container:

   ```bash
   docker restart homebridge
   ```

---

## 4. Configuration

**Note:** You **must** press **Allow** on the TV when it prompts (first connection); otherwise the plugin cannot talk to the TV. Using a **static IP** for your Frame TV is recommended so the plugin can reach it reliably (set via your router or the TV’s network settings).

You can set up the plugin via the **Homebridge UI** (recommended) or by editing `config.json` manually.

### 4.1 Via Homebridge UI

1. Open the Homebridge UI (e.g. http://homebridge.local or your Homebridge URL).
2. Go to **Plugins** (or **Plugins** → **Installed**) and find **EzFrame Homebridge**.
3. Add the platform and configure your TV(s): add each TV by its **IP address**.
4. Save and restart Homebridge. On first use, the TV will show **Allow** — press **Allow** once.

Optional: in the plugin settings you can set a custom **Art Mode** switch name (default is `"Art Mode"`). The name in Home will be **TV name + this suffix** (e.g. “The Frame Art Mode”).

### 4.2 Manual config (config.json)

Edit Homebridge `config.json` (path depends on your setup, e.g. `/homebridge/config.json` in Docker):

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

## 5. First-time pairing

1. Save the config and restart Homebridge.
2. When the plugin talks to the TV for the first time, the TV will show **Allow** / **Deny**.
3. You **must** press **Allow** on the TV. The plugin stores the token (e.g. in `ezframe-tokens.json` next to the Homebridge config) and won’t ask again. If you miss it, restart Homebridge and watch the TV for the prompt again.

After that, the **Art Mode** switch for that TV should appear in the Home app.

---

## 6. Optional: build and pack locally

From the plugin source directory:

```bash
cd ezframe-homebridge-plugin
npm ci
npm run build
npm pack
```

You’ll get `homebridge-ezframe-samsungframetv-artmode-<version>.tgz`. Install it with:

```bash
sudo npm install -g ./homebridge-ezframe-samsungframetv-artmode-<version>.tgz
```

(Or use the Docker steps above and copy this `.tgz` into the container.)
