import { prisma } from "../lib/prisma.js";
import { AccessToken } from "livekit-server-sdk";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export async function createLiveKitToken(user: { id?: number; name: string; role: string }, roomName: string, identity?: string) {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!livekitUrl || !apiKey || !apiSecret) throw new Error("LiveKit configuration is missing");

  const role = user.role === "buyer" || user.role === "guest" ? user.role : "farmer";
  const token = new AccessToken(apiKey, apiSecret, { identity: identity ?? String(user.id), name: user.name, ttl: "2h" });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: role === "farmer", canPublishData: true, canSubscribe: true });
  return { serverUrl: livekitUrl, participantToken: await token.toJwt(), roomName, role };
}

export async function createGuestLiveKitToken(roomName: string, guestSessionId: string) {
  const member = await prisma.roomMember.findFirst({ where: { guestSessionId, room: { roomCode: roomName } } });
  if (!member) throw new Error("Invalid guest session");
  return createLiveKitToken({ name: member.displayName ?? "Guest", role: "guest" }, roomName, `guest-${guestSessionId}`);
}

export async function createUserLiveKitToken(userId: number, roomName: string) {
  const member = await prisma.roomMember.findFirst({
    where: { userId, room: { roomCode: roomName, status: { in: ["scheduled", "active"] } } },
    include: { user: true }
  });
  if (!member?.user) throw new Error("User is not a member of this room");
  return createLiveKitToken(member.user, roomName, String(userId));
}

export const listLots = () => prisma.coffeeLot.findMany({ include: { seller: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "desc" } });
export const getLot = (id: number) => prisma.coffeeLot.findUnique({ where: { id }, include: { seller: { select: { id: true, name: true } }, inspectionRooms: true } });
export const createLot = (sellerId: number, body: any) => prisma.coffeeLot.create({ data: { sellerId, lotCode: body.lotCode, name: body.name, variety: body.variety, origin: body.origin, quantityKg: body.quantityKg } });
export interface HistoryFilters {
  userId: number;
  roomCode?: string;
  coffeeLotId?: number;
  capturedBy?: number;
  sampleNumber?: number;
  from?: Date;
  to?: Date;
}

export const getAllHistories = (filters: HistoryFilters) => {
  const where: Prisma.InspectionWhereInput = {
    ...(filters.capturedBy ? { capturedBy: filters.capturedBy } : {}),
    ...(filters.sampleNumber ? { sampleNumber: filters.sampleNumber } : {}),
    ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
    room: {
      members: { some: { userId: filters.userId } },
      ...(filters.roomCode ? { roomCode: filters.roomCode } : {}),
      ...(filters.coffeeLotId ? { coffeeLotId: filters.coffeeLotId } : {})
    }
  };
  return prisma.inspection.findMany({ where, include: { detections: true, room: { include: { coffeeLot: true } } }, orderBy: { createdAt: "desc" } });
};
export const getHistoryById = (id: number, userId: number) => prisma.inspection.findFirst({ where: { id, room: { members: { some: { userId } } } }, include: { detections: true, room: { include: { coffeeLot: true } } } });
const COFFEE_VARIETIES = ["Arabica", "Robusta"] as const;

const normalizeVariety = (value: unknown) => {
  if (typeof value !== "string") throw new Error("commodity must be Arabica or Robusta");
  const variety = COFFEE_VARIETIES.find((item) => item.toLowerCase() === value.trim().toLowerCase());
  if (!variety) throw new Error("commodity must be Arabica or Robusta");
  return variety;
};

export const createRoom = async (userId: number, body: any) => {
  let coffeeLotId: number;

  if (body.coffeeLotId !== undefined && body.coffeeLotId !== null && body.coffeeLotId !== "") {
    coffeeLotId = Number(body.coffeeLotId);
    if (!Number.isInteger(coffeeLotId) || coffeeLotId <= 0) throw new Error("coffeeLotId must be a valid integer");
  } else {
    const variety = normalizeVariety(body.commodity ?? body.variety);
    const lot = await prisma.coffeeLot.create({
      data: {
        sellerId: userId,
        lotCode: `AUTO-${variety.toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${variety} Coffee`,
        variety,
        origin: "Unknown",
        quantityKg: 0
      }
    });
    coffeeLotId = lot.id;
  }

  return prisma.inspectionRoom.create({
    data: {
      coffeeLotId,
      roomCode: `room-${Date.now().toString(36)}`,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      members: { create: { userId, role: body.role ?? "seller" } }
    },
    include: { coffeeLot: true }
  });
};
export const getRoom = (roomCode: string) => prisma.inspectionRoom.findUnique({ where: { roomCode }, include: { coffeeLot: true, members: true, requests: true, inspections: { include: { detections: true } }, reports: true } });
export const getRecentRooms = (userId: number) => prisma.inspectionRoom.findMany({ where: { status: { in: ["scheduled", "active"] }, members: { some: { userId, leftAt: null } } }, include: { coffeeLot: true, members: true }, orderBy: { createdAt: "desc" }, take: 20 });
export const getAvailableRooms = () => prisma.inspectionRoom.findMany({ where: { status: { in: ["scheduled", "active"] } }, include: { coffeeLot: true }, orderBy: { createdAt: "desc" }, take: 50 });
export const completeRoom = (roomCode: string, userId: number) => prisma.inspectionRoom.updateMany({ where: { roomCode, members: { some: { userId, role: { in: ["seller", "farmer"] } } }, status: { not: "completed" } }, data: { status: "completed" } }).then(async (result) => result.count ? getRoom(roomCode) : null);
export const leaveRoom = async (roomCode: string, userId: number) => {
  const member = await prisma.roomMember.findFirst({ where: { room: { roomCode }, userId } });
  if (!member) return null;
  await prisma.roomMember.update({ where: { id: member.id }, data: { leftAt: new Date() } });
  return getRoom(roomCode);
};
export const joinRoom = async (roomCode: string, userId: number | null, role: string, displayName?: string, guestSessionId?: string) => {
  const room = await prisma.inspectionRoom.findUnique({ where: { roomCode } });
  if (!room) return null;
  let sessionId = guestSessionId;
  let memberName = displayName;
  if (userId) {
    const existing = await prisma.roomMember.findFirst({ where: { roomId: room.id, userId } });
    if (existing) await prisma.roomMember.update({ where: { id: existing.id }, data: { role, leftAt: null } });
    else await prisma.roomMember.create({ data: { roomId: room.id, userId, role } });
  } else {
    if (!memberName?.trim()) throw new Error("displayName is required for guest joining");
    const existing = sessionId ? await prisma.roomMember.findFirst({ where: { roomId: room.id, guestSessionId: sessionId } }) : null;
    sessionId = existing?.guestSessionId ?? sessionId ?? randomUUID();
    if (existing) await prisma.roomMember.update({ where: { id: existing.id }, data: { role: "guest", displayName: memberName.trim(), leftAt: null } });
    else await prisma.roomMember.create({ data: { roomId: room.id, userId: null, role: "guest", displayName: memberName.trim(), guestSessionId: sessionId } });
  }
  const joined = await prisma.inspectionRoom.update({ where: { id: room.id }, data: { status: "active" }, include: { coffeeLot: true } });
  const participant = userId ? { id: userId, name: "User", role } : { name: memberName!.trim(), role };
  const livekit = await createLiveKitToken(participant, room.roomCode, userId ? String(userId) : `guest-${sessionId}`);
  return { ...joined, guestSessionId: userId ? undefined : sessionId, livekit };
};
export const createRequest = (roomCode: string, userId: number, body: any) => prisma.inspectionRoom.update({ where: { roomCode }, data: { requests: { create: { requestedBy: userId, requestType: body.requestType, message: body.message } } }, include: { requests: true } });
export const createInspection = (roomCode: string, userId: number, body: any) => prisma.inspection.create({ data: { room: { connect: { roomCode } }, capturer: { connect: { id: userId } }, sampleNumber: Number(body.sampleNumber), layer: body.layer, imageUrl: body.imageUrl, modelVersion: body.modelVersion, qualityScore: body.qualityScore, healthyPercent: body.healthyPercent, damagedPercent: body.damagedPercent, insectDamagePercent: body.insectDamagePercent, confidencePercent: body.confidencePercent, detections: { create: body.detections ?? [] } }, include: { detections: true } });
export const createReport = (roomCode: string, userId: number, body: any) => prisma.report.create({ data: { room: { connect: { roomCode } }, generator: { connect: { id: userId } }, finalQualityScore: body.finalQualityScore, summary: body.summary, pdfUrl: body.pdfUrl } });
