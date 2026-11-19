import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { decodeJwt } from "jose";

const base = process.env.E2E_BASE_URL ?? "http://localhost:8787/api/v1";
async function call(path: string, token?: string, body?: unknown, status = 200) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  return result.data;
}
async function register(role: string) {
  return call("/auth/register", undefined, {
    role, name: role + " fixture", email: randomUUID() + "@fixture.test", password: "fixture-password-123"
  }, 201);
}
const seller = await register("farmer");
const buyer = await register("buyer");
const outsider = await register("buyer");
await call("/inspections/history?sampleNumber=bad", buyer.accessToken, undefined, 400);
await call("/inspections/history?from=invalid", buyer.accessToken, undefined, 400);
await call("/inspections/livekit/token", "invalid-token", { roomName: "missing" }, 401);
await call("/inspections/rooms", buyer.accessToken, { commodity: "Arabica" }, 403);
const room = await call("/inspections/rooms", seller.accessToken, { commodity: "Arabica" }, 201);
const path = "/inspections/rooms/" + room.roomCode;
const joined = await call(path + "/join", buyer.accessToken, {});
const buyerJWT = decodeJwt(joined.livekit.participantToken);
assert.equal((buyerJWT.video as any).canPublish, true, "Buyer must be able to speak");
assert.deepEqual((buyerJWT.video as any).canPublishSources, ["microphone"], "Buyer publishing must be microphone-only");
assert.equal(JSON.parse(buyerJWT.metadata as string).role, "buyer");
assert.equal(buyerJWT.name, "buyer fixture");

const guest = await call(path + "/join", undefined, { role: "guest", displayName: "Dita" });
const guestJWT = decodeJwt(guest.livekit.participantToken);
assert.deepEqual((guestJWT.video as any).canPublishSources, ["microphone"]);
await call(path + "/join", undefined, { role: "guest", displayName: 123 }, 400);
await call(path + "/status", undefined, {}, 403);
const claim = "/inspections/guest-sessions/claim";
await call(claim, buyer.accessToken, { guestSessionId: guest.guestSessionId }, 409);

const inspection = {
  sampleNumber: 1, layer: "top", imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  imageContentType: "image/png", modelVersion: "fixture", qualityScore: 95,
  healthyPercent: 95, damagedPercent: 5, insectDamagePercent: 0, confidencePercent: 99, detections: []
};
const payload = {
  requestId: randomUUID(), inspection,
  report: { finalQualityScore: 95, summary: "Fixture" },
  result: { grade: "Grade 1", confidence: 99, totalBeans: 20, healthyBeans: 19, defects: [{ id: "broken", name: "Pecah", details: [{ id: "one", name: "Pecah", count: 1 }] }] }
};
await call(path + "/complete", buyer.accessToken, payload, 403);
await call(path + "/complete", seller.accessToken, { ...payload, report: { summary: "missing score" } }, 400);
const afterFailure = await call(path, seller.accessToken);
assert.equal(afterFailure.status, "active", "A failed result save must keep the room open");
assert.equal(afterFailure.inspections.length, 0, "A failed report must roll back its inspection");
const storageControl = process.env.STORAGE_TEST_CONTROL_URL;
if (storageControl) {
  await fetch(storageControl + "/_test/fail", { method: "POST" });
  await call(path + "/complete", seller.accessToken, payload, 503);
  const afterUploadFailure = await call(path, seller.accessToken);
  assert.equal(afterUploadFailure.status, "active");
  assert.equal(afterUploadFailure.inspections.length, 0);
}
const [first, second] = await Promise.all([
  call(path + "/complete", seller.accessToken, payload),
  call(path + "/complete", seller.accessToken, payload)
]);
assert.equal(first.status, "completed");
assert.equal(second.status, "completed");
const state = await call(path + "/status", undefined, { guestSessionId: guest.guestSessionId });
assert.equal(state.status, "completed");
assert.deepEqual(state.result, payload.result);
await call(path + "/join", buyer.accessToken, {}, 409);
await call("/inspections/livekit/token", undefined, { roomName: room.roomCode, guestSessionId: guest.guestSessionId }, 409);
const guestAccount = await register("buyer");
const claimed = await call(claim, guestAccount.accessToken, { guestSessionId: guest.guestSessionId });
assert.equal(claimed.roomCode, room.roomCode);
await call(claim, guestAccount.accessToken, { guestSessionId: guest.guestSessionId });
await call(claim, outsider.accessToken, { guestSessionId: guest.guestSessionId }, 403);
const histories = await call("/inspections/history", guestAccount.accessToken);
assert.equal(histories.length, 1);
assert.equal(histories[0].room.roomCode, room.roomCode);
assert.ok(histories[0].imageUrl.includes("/storage/v1/object/public/inspection-images/"));
assert.ok(histories[0].imagePath.startsWith("inspections/"));
const image = await fetch(histories[0].imageUrl);
assert.equal(image.status, 200);
assert.equal(Buffer.from(await image.arrayBuffer()).toString("base64"), inspection.imageBase64.split(",")[1]);
assert.equal((await call("/inspections/history", outsider.accessToken)).length, 0);
await call("/inspections/history/" + histories[0].id, outsider.accessToken, undefined, 404);
await call(path + "/reports", buyer.accessToken, payload.report, 403);
const detail = await call(path, seller.accessToken);
assert.equal(detail.inspections.length, 1, "Retried completion must save a single inspection");
assert.equal(detail.reports.length, 1, "Retried completion must save a single report");
assert.ok(detail.members.every((m: any) => !("guestSessionId" in m)), "Room detail must keep guest secrets private");
if (storageControl) {
  const state = await fetch(storageControl + "/_test/state").then(response => response.json());
  assert.equal(state.objects, 1, "Retried completion must reuse its stored image object");
}
console.log("Room access passed: buyer/guest mic, atomic save and retry, guest claim and isolation, completion recovery");
