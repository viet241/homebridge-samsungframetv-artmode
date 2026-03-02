# EzFrame Homebridge Plugin - Guide

## Build & Package

```bash
npm run build
npm pack
```

Output: `homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz`

---

## Install (local machine)

```bash
npm install -g ./homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz
```

---

## Install (Docker on NAS)

```bash
# 1. Copy tgz into container
docker cp homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz homebridge:/homebridge/

sudo docker cp /volume1/Data/homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz homebridge:/homebridge/
sudo docker exec -it homebridge sh -c "cd /homebridge && npm install ./homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz"

# 2. Install inside container
docker exec -it homebridge sh
cd /homebridge && npm install ./homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz
exit

# 3. Restart Homebridge
docker restart homebridge
```

---

## Test Script (standalone)

```bash
# Get TV info (no token needed)
npx tsx scripts/test-tv.ts 192.168.68.113 info

# Pair with TV (press Allow on TV)
npx tsx scripts/test-tv.ts 192.168.68.113 pair

# Art Mode
npx tsx scripts/test-tv.ts 192.168.68.113 status
npx tsx scripts/test-tv.ts 192.168.68.113 on
npx tsx scripts/test-tv.ts 192.168.68.113 off

# Remote keys
npx tsx scripts/test-tv.ts 192.168.68.113 home
npx tsx scripts/test-tv.ts 192.168.68.113 power
```

Token saved to `ezframe-tokens.json` (in current directory).

---

## Switch (công tắc)

Khai báo trong `src/platformAccessory.ts` — mỗi TV có **1 Switch**:

| subType | Mặc định | Chức năng |
|--------|----------|-----------|
| ArtMode | `"Art Mode"` | Bật/tắt Art Mode |

Tên hiển thị = **TV Name** + **suffix** (vd: "The Frame Art Mode").

---

## Config (Homebridge config.json)

```json
{
  "platforms": [
    {
      "platform": "EzFrame Homebridge",
      "name": "EzFrame Homebridge",
      "tvs": [
        { "ip": "192.168.68.113" }
      ]
    }
  ]
}
```

**Tùy chỉnh tên** (optional):

```json
"switchNames": { "artMode": "Chế độ nghệ thuật" }
```

**Note:** `platform` must be exactly `"EzFrame Homebridge"`.

Only IP needed. On first use, TV shows Allow → press to pair.

---

## Troubleshooting

**"No plugin was found for the platform"**
- Plugin chưa được cài đúng. Cài lại: `npm install ./homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz` trong thư mục Homebridge
- Trên Docker: copy tgz vào `/homebridge/` rồi `npm install ./homebridge-ezframe-samsungframetv-artmode-1.0.0.tgz`

**Icon cây cầu gãy**
- Thường do plugin crash hoặc không load được. Xem log Homebridge để biết lỗi cụ thể
