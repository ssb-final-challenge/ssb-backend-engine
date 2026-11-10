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

## API

Authentication:

- `POST /api/auth/register` — `{ name, email, password, role }`
- `POST /api/auth/login` — `{ email, password }`

Protected feature endpoints require the JWT returned by login or registration:

```http
Authorization: Bearer <accessToken>
```

- `GET/POST /api/inspections/lots`
- `GET /api/inspections/lots/:id`
- `POST /api/inspections/rooms`
- `GET /api/inspections/rooms/:roomCode`
- `POST /api/inspections/rooms/:roomCode/join`
- `POST /api/inspections/rooms/:roomCode/requests`
- `GET /api/inspections/history` and `GET /api/inspections/history/:id`
- `POST /api/inspections/rooms/:roomCode/inspections`
- `POST /api/inspections/rooms/:roomCode/reports`
- `POST /api/inspections/livekit/token`
