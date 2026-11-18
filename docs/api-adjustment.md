# Beansight API Adjustment Context

Dokumen ini adalah referensi untuk tim mobile setelah penyesuaian backend terbaru.

Base URL production:

```text
https://ssb-backend-engine.vercel.app/api/v1
```

Semua response menggunakan format berikut.

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_FAILED",
    "message": "Error message"
  }
}
```

## 1. Important adjustments: before vs after

### Create inspection room

Before, mobile harus mengirim `coffeeLotId`:

```json
{
  "coffeeLotId": 1,
  "role": "seller"
}
```

After, mobile cukup mengirim jenis kopi:

```json
{
  "commodity": "Robusta"
}
```

Valid values:

```text
Arabica
Robusta
```

Backend akan membuat coffee lot otomatis dan menghubungkannya ke inspection room. `role` tidak boleh ditentukan oleh body; role seller diambil dari JWT.

### Join room

Before, join hanya mengembalikan data room.

After, join mengembalikan LiveKit token sehingga mobile dapat langsung masuk ke `ObserverRoomView`.

### Guest buyer

Before, guest hanya memiliki membership tanpa identitas stabil.

After, guest mengirim `displayName`, menerima `guestSessionId`, dan dapat reconnect atau refresh LiveKit token tanpa akun.

### Room lifecycle

Before, disconnect dari LiveKit tidak mengubah status room database.

After, mobile dapat memanggil endpoint `leave` dan `complete`. Untuk production, mobile tetap harus memanggil `complete` saat seller menekan End Call. LiveKit disconnect saja belum menutup room database secara otomatis.

## 2. Authentication

Simpan token dari `data.accessToken` dan kirim pada endpoint protected:

```http
Authorization: Bearer <accessToken>
```

### Register

```http
POST /auth/register
```

Request:

```json
{
  "name": "Gayo Seller",
  "email": "seller@example.com",
  "password": "password123",
  "role": "farmer"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "user": {
      "id": 1,
      "name": "Gayo Seller",
      "email": "seller@example.com",
      "role": "farmer"
    }
  }
}
```

### Login

```http
POST /auth/login
```

Request:

```json
{
  "email": "seller@example.com",
  "password": "password123"
}
```

Response sama dengan register.

### Apple Sign In

```http
POST /auth/apple
```

Request:

```json
{
  "identity_token": "apple-identity-token",
  "apple_user_id": "001234.abc",
  "name": "Budi Santoso",
  "email": "budi@privaterelay.appleid.com",
  "role": "buyer",
  "nonce": "client-nonce"
}
```

Backend memvalidasi issuer, audience, expiry, signature, subject, dan nonce sebelum menerbitkan JWT aplikasi.

### Delete account

```http
DELETE /auth/account
Authorization: Bearer <accessToken>
```

## 3. Seller flow

```text
Login/Register
  → Home
  → Create room with commodity
  → Receive roomCode
  → Join room
  → Open ObserverRoomView
  → End Call
  → Complete room
```

### Create room

```http
POST /inspections/rooms
Authorization: Bearer <seller-token>
```

Request:

```json
{
  "commodity": "Arabica"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Room created",
  "data": {
    "id": 1,
    "coffeeLotId": 10,
    "roomCode": "room-abc123",
    "status": "scheduled",
    "coffeeLot": {
      "id": 10,
      "variety": "Arabica",
      "name": "Arabica Coffee"
    }
  }
}
```

### Get recent rooms

```http
GET /inspections/rooms/recent
Authorization: Bearer <seller-token>
```

Returns the seller's `scheduled` or `active` rooms. A room left by the seller can still be rejoined.

### Get available rooms

```http
GET /inspections/rooms/available
Authorization: Bearer <accessToken>
```

Returns rooms whose status is `scheduled` or `active`.

### Seller join/rejoin

```http
POST /inspections/rooms/{roomCode}/join
Authorization: Bearer <seller-token>
```

Request:

```json
{}
```

The role is read from the JWT. Do not send a forged role in the body.

## 4. Buyer with account flow

```text
Login/Register
  → Home
  → Select recent room or enter roomCode from Universal Link
  → Join room
  → Wait for seller camera if needed
  → Connect to LiveKit
```

### Buyer join

```http
POST /inspections/rooms/{roomCode}/join
Authorization: Bearer <buyer-token>
```

Request:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Joined room",
  "data": {
    "roomCode": "room-abc123",
    "status": "active",
    "livekit": {
      "serverUrl": "wss://project.livekit.cloud",
      "participantToken": "livekit-jwt",
      "roomName": "room-abc123",
      "role": "buyer"
    }
  }
}
```

The buyer role always comes from the JWT, even if the request body contains another role.

## 5. Buyer guest flow

```text
SignInWelcomeView
  → Tap “Lanjutkan sebagai pembeli”
  → Show “Gabung Ruang Observasi” sheet
  → User enters displayName
  → User opens Universal Link or enters roomCode
  → Join without JWT
  → Save guestSessionId securely
  → Connect to LiveKit
```

### Guest join

```http
POST /inspections/rooms/{roomCode}/join
```

Request:

```json
{
  "role": "guest",
  "displayName": "Budi"
}
```

Response:

```json
{
  "success": true,
  "message": "Joined room",
  "data": {
    "roomCode": "room-abc123",
    "status": "active",
    "guestSessionId": "guest-session-uuid",
    "livekit": {
      "serverUrl": "wss://project.livekit.cloud",
      "participantToken": "livekit-jwt",
      "roomName": "room-abc123",
      "role": "guest"
    }
  }
}
```

Store `guestSessionId` in iOS Keychain. Do not store it in logs or analytics.

### Guest reconnect

```http
POST /inspections/rooms/{roomCode}/join
```

Request:

```json
{
  "role": "guest",
  "displayName": "Budi",
  "guestSessionId": "guest-session-uuid"
}
```

### Guest LiveKit token refresh

```http
POST /inspections/livekit/token
```

Request:

```json
{
  "roomName": "room-abc123",
  "guestSessionId": "guest-session-uuid"
}
```

Guest can join and observe, but cannot create an inspection or report until signing in. This prevents anonymous inspection results from being stored without an owner.

## 6. LiveKit

### Authenticated token refresh

```http
POST /inspections/livekit/token
Authorization: Bearer <accessToken>
```

Request:

```json
{
  "roomName": "room-abc123"
}
```

The backend verifies that the authenticated user is a member of the room before issuing a token.

### End call and room state

When the seller ends the inspection:

1. Disconnect from LiveKit in the mobile app.
2. Call:

```http
POST /inspections/rooms/{roomCode}/complete
Authorization: Bearer <seller-token>
```

3. Remove the room from active/recent available calls after receiving `status: completed`.

Response:

```json
{
  "success": true,
  "message": "Room completed",
  "data": {
    "roomCode": "room-abc123",
    "status": "completed"
  }
}
```

LiveKit disconnect by itself does not currently update the database. A future webhook can automate this for force-close or network-loss scenarios.

### Leave without completing

```http
POST /inspections/rooms/{roomCode}/leave
Authorization: Bearer <accessToken>
```

Leaving does not complete the room. The user can rejoin later.

## 7. Inspection, history, request, and report

### Submit inspection

```http
POST /inspections/rooms/{roomCode}/inspections
Authorization: Bearer <seller-token>
```

Request:

```json
{
  "sampleNumber": 1,
  "layer": "top",
  "imageUrl": "https://cdn.example.com/sample.jpg",
  "modelVersion": "coffee-model-1",
  "qualityScore": 86.5,
  "healthyPercent": 86.5,
  "damagedPercent": 8.5,
  "insectDamagePercent": 5,
  "confidencePercent": 92,
  "detections": [
    {
      "label": "insect_damage",
      "confidence": 0.92,
      "x": 0.25,
      "y": 0.3,
      "width": 0.1,
      "height": 0.12
    }
  ]
}
```

### History

```http
GET /inspections/history
Authorization: Bearer <accessToken>
```

Supported filters:

```text
?roomCode=room-abc123
?coffeeLotId=10
?capturedBy=15
?sampleNumber=1
?from=2026-01-01&to=2026-12-31
```

History returns inspection data, detections, room, and coffee lot including `variety`.
The result is scoped to rooms where the authenticated user is a member. A user cannot read another user's inspection history.

### History detail

```http
GET /inspections/history/{id}
Authorization: Bearer <accessToken>
```

The detail endpoint applies the same room-membership authorization rule.

### Inspection request

```http
POST /inspections/rooms/{roomCode}/requests
Authorization: Bearer <accessToken>
```

Request:

```json
{
  "requestType": "rescan",
  "message": "Please inspect another sample"
}
```

### Create report

```http
POST /inspections/rooms/{roomCode}/reports
Authorization: Bearer <seller-token>
```

Request:

```json
{
  "finalQualityScore": 86.5,
  "summary": "Coffee quality is acceptable",
  "pdfUrl": "https://cdn.example.com/report.pdf"
}
```

## 8. Universal Link

Share this URL through WhatsApp or another messaging application:

```text
https://ssb-backend-engine.vercel.app/join/{roomCode}
```

The backend also serves:

```text
https://ssb-backend-engine.vercel.app/.well-known/apple-app-site-association
```

iOS requirements:

1. Add the **Associated Domains** capability.
2. Add:

```text
applinks:ssb-backend-engine.vercel.app
```

3. Use the exact production Bundle ID and Team ID in AASA.
4. Handle `/join/{roomCode}` with `onOpenURL` or `NSUserActivity`.
5. Test using a TestFlight/App Store build; old builds may not contain the entitlement.

## 9. Public application information

```http
GET /health
GET /privacy-policy
GET /support
GET /copyright
GET /api/docs
GET /api/docs/openapi.json
```

## 10. Mobile implementation rules

- Never send `coffeeLotId` when creating a new room unless using a legacy flow.
- Never trust or persist role from the request body for authenticated users.
- Save authenticated JWT in secure storage.
- Save guest session ID in Keychain.
- Do not log JWT, Apple identity token, guest session ID, or LiveKit participant token.
- Show a waiting state when the buyer enters before the seller camera is available.
- Allow seller and authenticated buyer to rejoin rooms with status `scheduled` or `active`.
- Only the seller/farmer can complete the room.
- Guest users can observe but must authenticate before creating inspection results or reports.
