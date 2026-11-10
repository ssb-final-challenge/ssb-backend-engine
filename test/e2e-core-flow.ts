import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:8787/api/v1";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let serverProcess: ChildProcess | undefined;

async function ensureServer() {
  const healthUrl = `${baseUrl.replace(/\/api\/v1$/, "")}/health`;
  try {
    if ((await fetch(healthUrl)).ok) return;
  } catch { /* Start a local server below. */ }

  serverProcess = spawn("node", ["--env-file=.env", "--import=tsx", "server.ts"], {
    stdio: "inherit",
    env: process.env
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(healthUrl)).ok) return;
    } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw new Error("Could not start the local API on port 8787");
}

process.once("exit", () => serverProcess?.kill());
await ensureServer();

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) }
  });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${options.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  return body as T;
}

function auth(token: string) { return { Authorization: `Bearer ${token}` }; }

const sellerEmail = `e2e-seller-${suffix}@example.com`;
const buyerEmail = `e2e-buyer-${suffix}@example.com`;
const password = "E2E-password-123!";

const sellerRegistration = await request<{ data: { user: { id: number }; accessToken: string } }>("/auth/register", {
  method: "POST", body: JSON.stringify({ name: "E2E Seller", email: sellerEmail, password, role: "farmer" })
});
const buyerRegistration = await request<{ data: { user: { id: number }; accessToken: string } }>("/auth/register", {
  method: "POST", body: JSON.stringify({ name: "E2E Buyer", email: buyerEmail, password, role: "buyer" })
});

const sellerToken = sellerRegistration.data.accessToken;
const buyerToken = buyerRegistration.data.accessToken;
assert.ok(sellerToken && buyerToken, "Registration must return access tokens");

const lot = await request<{ data: { id: number; lotCode: string } }>("/inspections/lots", {
  method: "POST", headers: auth(sellerToken),
  body: JSON.stringify({ lotCode: `LOT-${suffix}`, name: "E2E Arabica Lot", variety: "Arabica", origin: "Gayo", quantityKg: 250 })
});

const room = await request<{ data: { roomCode: string } }>("/inspections/rooms", {
  method: "POST", headers: auth(sellerToken),
  body: JSON.stringify({ coffeeLotId: lot.data.id, role: "seller" })
});
const roomCode = room.data.roomCode;
assert.ok(roomCode, "Room creation must return a room code");

const liveKit = await request<{ data: { participantToken: string; roomName: string; role: string } }>("/inspections/livekit/token", {
  method: "POST", headers: auth(sellerToken), body: JSON.stringify({ roomName: roomCode })
});
assert.equal(liveKit.data.roomName, roomCode);
assert.equal(liveKit.data.role, "farmer");
assert.ok(liveKit.data.participantToken, "LiveKit token must be returned");

const retrieved = await request<{ data: { roomCode: string } }>(`/inspections/rooms/${roomCode}`, { headers: auth(sellerToken) });
assert.equal(retrieved.data.roomCode, roomCode);

await request(`/inspections/rooms/${roomCode}/join`, {
  method: "POST", headers: auth(buyerToken), body: JSON.stringify({ role: "buyer" })
});

const joined = await request<{ data: { members: Array<{ userId: number; role: string }> } }>(`/inspections/rooms/${roomCode}`, { headers: auth(buyerToken) });
assert.ok(joined.data.members.some((member) => member.role === "buyer"));

const inspection = await request<{ data: { id: number; roomId: number; sampleNumber: number; detections: Array<{ label: string }> } }>(`/inspections/rooms/${roomCode}/inspections`, {
  method: "POST",
  headers: auth(sellerToken),
  body: JSON.stringify({
    sampleNumber: 1,
    layer: "top",
    imageUrl: "https://example.com/e2e-coffee-sample.jpg",
    modelVersion: "e2e-model-1",
    qualityScore: 86.5,
    healthyPercent: 86.5,
    damagedPercent: 8.5,
    insectDamagePercent: 5,
    confidencePercent: 92,
    detections: [{ label: "insect_damage", confidence: 0.92, x: 0.25, y: 0.3, width: 0.1, height: 0.12 }]
  })
});
assert.equal(inspection.data.sampleNumber, 1);
assert.equal(inspection.data.detections[0]?.label, "insect_damage");

const history = await request<{ data: Array<{ id: number; room: { roomCode: string }; detections: Array<{ label: string }> }> }>("/inspections/history", {
  headers: auth(buyerToken)
});
const savedInspection = history.data.find((item) => item.id === inspection.data.id);
assert.ok(savedInspection, "Saved inspection must be available in history");
assert.equal(savedInspection.room.roomCode, roomCode);
assert.equal(savedInspection.detections[0]?.label, "insect_damage");

console.log(`E2E core flow passed: seller=${sellerEmail}, buyer=${buyerEmail}, room=${roomCode}`);
serverProcess?.kill();
