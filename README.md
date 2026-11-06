# Exportra LiveKit token API

This service keeps the LiveKit API secret off the iOS app. It returns a short-lived token for either a `farmer` or `buyer`.

```bash
npm install
cp .env.example .env
# fill LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
node --env-file=.env server.mjs
```

Request:

```bash
curl -X POST http://localhost:8787/api/livekit/token \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"inspection-SID-2408","identity":"buyer-andi","role":"buyer"}'
```

Farmer tokens can publish camera/audio. Buyer tokens can subscribe and publish data, but cannot publish camera/audio.
# ssb-backend
