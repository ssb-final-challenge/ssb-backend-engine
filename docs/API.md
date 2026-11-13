# Beansight API Documentation

Base URL production:

```text
https://ssb-backend-engine.vercel.app/api/v1
```

Local development:

```text
http://localhost:8787/api/v1
```

Swagger UI:

```text
https://ssb-backend-engine.vercel.app/api/docs
```

OpenAPI JSON:

```text
https://ssb-backend-engine.vercel.app/api/docs/openapi.json
```

## Response format

Successful responses use:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_FAILED",
    "message": "Invalid request"
  }
}
```

Prisma `Decimal` values are returned as strings, for example `"86.50"` and `"0.9200"`.

## Authentication

Register or login first. Store the returned `accessToken`, then send it on protected requests:

```http
Authorization: Bearer <accessToken>
```

## 1. Register

`POST /auth/register`

Request:

```json
{
  "name": "Gayo Seller",
  "email": "seller@example.com",
  "password": "password123",
  "role": "farmer"
}
```

Roles: `farmer`, `seller`, or `buyer`.

Response `201`:

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Gayo Seller",
      "email": "seller@example.com",
      "role": "farmer",
      "createdAt": "2026-11-12T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## 2. Login

`POST /auth/login`

Request:

```json
{
  "email": "seller@example.com",
  "password": "password123"
}
```

Response `200`: same structure as registration.

## 3. Delete account

`DELETE /auth/account`

This endpoint requires only the authenticated user's JWT. No request body is needed.

```http
Authorization: Bearer <accessToken>
```

The operation removes the user account, owned coffee lots and rooms, room memberships, requests, submitted inspections and detections, and generated reports. Memberships in rooms owned by other users are removed without deleting those rooms.

Response `200`:

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "userId": 1,
    "deleted": true
  }
}
```

This action is permanent and cannot be undone.

## 4. Sign in with Apple

`POST /auth/apple`

This endpoint verifies the Apple identity token server-side before issuing the Beansight JWT.

The backend accepts multiple Apple Bundle IDs through the comma-separated `APPLE_BUNDLE_IDS` environment variable. The token audience must match one of the configured IDs.

Request:

```json
{
  "identity_token": "APPLE_IDENTITY_TOKEN",
  "authorization_code": "APPLE_AUTHORIZATION_CODE",
  "apple_user_id": "001234.abc...",
  "name": "Budi Santoso",
  "email": "budi@privaterelay.appleid.com",
  "role": "buyer",
  "nonce": "client-nonce"
}
```

`name` and `email` may only be supplied by Apple during the first login. The Apple subject is the permanent account identifier.

Response `200`:

```json
{
  "success": true,
  "message": "Apple sign-in successful",
  "data": {
    "user": {
      "id": 2,
      "name": "Budi Santoso",
      "email": "budi@privaterelay.appleid.com",
      "role": "buyer",
      "createdAt": "2026-11-12T08:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## 4. List coffee lots

`GET /inspections/lots`

Authentication required.

Response `200`:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "sellerId": 1,
      "lotCode": "LOT-GAYO-001",
      "name": "Gayo Arabica",
      "variety": "Arabica",
      "origin": "Aceh Gayo",
      "quantityKg": "250",
      "createdAt": "2026-11-12T08:00:00.000Z",
      "seller": {
        "id": 1,
        "name": "Gayo Seller",
        "role": "farmer"
      }
    }
  ]
}
```

## 5. Create coffee lot

`POST /inspections/lots`

Request:

```json
{
  "lotCode": "LOT-GAYO-001",
  "name": "Gayo Arabica",
  "variety": "Arabica",
  "origin": "Aceh Gayo",
  "quantityKg": 250
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Lot created",
  "data": {
    "id": 1,
    "sellerId": 1,
    "lotCode": "LOT-GAYO-001",
    "name": "Gayo Arabica",
    "variety": "Arabica",
    "origin": "Aceh Gayo",
    "quantityKg": "250",
    "createdAt": "2026-11-12T08:00:00.000Z"
  }
}
```

## 6. Get coffee lot

`GET /inspections/lots/:id`

Example:

```text
GET /inspections/lots/1
```

Response `200` returns the lot object with `seller` and `inspectionRooms`.

## 7. Create inspection room

`POST /inspections/rooms`

Request:

```json
{
  "coffeeLotId": 1,
  "role": "seller",
  "scheduledAt": "2026-11-12T09:00:00.000Z"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Room created",
  "data": {
    "id": 1,
    "coffeeLotId": 1,
    "roomCode": "room-mwacb7lc",
    "status": "scheduled",
    "scheduledAt": "2026-11-12T09:00:00.000Z",
    "createdAt": "2026-11-12T08:00:00.000Z",
    "coffeeLot": {
      "id": 1,
      "lotCode": "LOT-GAYO-001",
      "name": "Gayo Arabica"
    }
  }
}
```

## 8. Get inspection room

`GET /inspections/rooms/:roomCode`

Example:

```text
GET /inspections/rooms/room-mwacb7lc
```

Response `200` includes:

- `coffeeLot`
- `members`
- `requests`
- `inspections`
- `reports`

## 9. Join inspection room

`POST /inspections/rooms/:roomCode/join`

Request:

```json
{
  "role": "buyer"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Joined room",
  "data": {
    "id": 1,
    "roomCode": "room-mwacb7lc",
    "status": "active"
  }
}
```

## 10. Create inspection request

`POST /inspections/rooms/:roomCode/requests`

Request:

```json
{
  "requestType": "rescan",
  "message": "Please inspect the other side of the beans."
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Request created",
  "data": {
    "requests": [
      {
        "id": 1,
        "roomId": 1,
        "requestedBy": 2,
        "requestType": "rescan",
        "status": "pending",
        "message": "Please inspect the other side of the beans.",
        "createdAt": "2026-11-12T08:20:00.000Z"
      }
    ]
  }
}
```

## 11. Submit inspection result

`POST /inspections/rooms/:roomCode/inspections`

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

Response `201`:

```json
{
  "success": true,
  "message": "Inspection created",
  "data": {
    "id": 1,
    "roomId": 1,
    "capturedBy": 1,
    "sampleNumber": 1,
    "layer": "top",
    "imageUrl": "https://cdn.example.com/sample.jpg",
    "modelVersion": "coffee-model-1",
    "qualityScore": "86.50",
    "healthyPercent": "86.50",
    "damagedPercent": "8.50",
    "insectDamagePercent": "5.00",
    "confidencePercent": "92.00",
    "createdAt": "2026-11-12T08:10:00.000Z",
    "detections": [
      {
        "id": 1,
        "inspectionId": 1,
        "label": "insect_damage",
        "confidence": "0.9200",
        "x": "0.250000",
        "y": "0.300000",
        "width": "0.100000",
        "height": "0.120000"
      }
    ]
  }
}
```

## 12. Retrieve inspection history

`GET /inspections/history`

Optional filters:

```text
roomCode
coffeeLotId
capturedBy
sampleNumber
from
to
```

Example:

```text
GET /inspections/history?roomCode=room-mwacb7lc&sampleNumber=1&from=2026-11-12T00:00:00Z&to=2026-11-12T23:59:59Z
```

Response `200`:

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "roomId": 1,
      "capturedBy": 1,
      "sampleNumber": 1,
      "layer": "top",
      "imageUrl": "https://cdn.example.com/sample.jpg",
      "modelVersion": "coffee-model-1",
      "qualityScore": "86.50",
      "healthyPercent": "86.50",
      "damagedPercent": "8.50",
      "insectDamagePercent": "5.00",
      "confidencePercent": "92.00",
      "createdAt": "2026-11-12T08:10:00.000Z",
      "detections": [],
      "room": {
        "roomCode": "room-mwacb7lc",
        "status": "active",
        "coffeeLot": {
          "id": 1,
          "lotCode": "LOT-GAYO-001",
          "name": "Gayo Arabica"
        }
      }
    }
  ]
}
```

## 13. Get inspection history detail

`GET /inspections/history/:id`

Example:

```text
GET /inspections/history/1
```

Response `200` returns one inspection object with its `detections`, `room`, and `coffeeLot`.

## 14. Create report

`POST /inspections/rooms/:roomCode/reports`

Request:

```json
{
  "finalQualityScore": 86.5,
  "summary": "Good quality sample with minor insect damage.",
  "pdfUrl": "https://cdn.example.com/report.pdf"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "Report created",
  "data": {
    "id": 1,
    "roomId": 1,
    "generatedBy": 1,
    "finalQualityScore": "86.50",
    "summary": "Good quality sample with minor insect damage.",
    "pdfUrl": "https://cdn.example.com/report.pdf",
    "createdAt": "2026-11-12T08:30:00.000Z"
  }
}
```

## 15. Create LiveKit token

`POST /inspections/livekit/token`

Request:

```json
{
  "roomName": "room-mwacb7lc"
}
```

The user identity and role come from the JWT, not from the request body.

Response `200`:

```json
{
  "success": true,
  "message": "Token created",
  "data": {
    "serverUrl": "wss://project.livekit.cloud",
    "participantToken": "livekit-jwt",
    "roomName": "room-mwacb7lc",
    "role": "farmer"
  }
}
```

## Core FE flow

1. Register/login or use Apple sign-in.
2. Save `data.accessToken`.
3. Create or retrieve a coffee lot.
4. Seller creates an inspection room and receives `data.roomCode`.
5. Both users request LiveKit tokens using the room code.
6. Buyer joins using `POST /inspections/rooms/:roomCode/join`.
7. Seller submits inspection results.
8. Buyer retrieves results from `GET /inspections/history`.
