import { prisma } from "../lib/prisma.js";
import { AccessToken } from "livekit-server-sdk";

export async function createLiveKitToken(user: { id: number; name: string; role: string }, roomName: string) {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!livekitUrl || !apiKey || !apiSecret) throw new Error("LiveKit configuration is missing");

  const role = user.role === "buyer" ? "buyer" : "farmer";
  const token = new AccessToken(apiKey, apiSecret, { identity: String(user.id), name: user.name, ttl: "2h" });
  token.addGrant({ roomJoin: true, room: roomName, canPublish: role === "farmer", canPublishData: true, canSubscribe: true });
  return { serverUrl: livekitUrl, participantToken: await token.toJwt(), roomName, role };
}

export const listLots = () => prisma.coffeeLot.findMany({ include: { seller: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "desc" } });
export const getLot = (id: number) => prisma.coffeeLot.findUnique({ where: { id }, include: { seller: { select: { id: true, name: true } }, inspectionRooms: true } });
export const createLot = (sellerId: number, body: any) => prisma.coffeeLot.create({ data: { sellerId, lotCode: body.lotCode, name: body.name, variety: body.variety, origin: body.origin, quantityKg: body.quantityKg } });
export const getAllHistories = () => prisma.inspection.findMany({ include: { detections: true, room: { include: { coffeeLot: true } } }, orderBy: { createdAt: "desc" } });
export const getHistoryById = (id: number) => prisma.inspection.findUnique({ where: { id }, include: { detections: true, room: { include: { coffeeLot: true } } } });
export const createRoom = (userId: number, body: any) => prisma.inspectionRoom.create({ data: { coffeeLotId: Number(body.coffeeLotId), roomCode: `room-${Date.now().toString(36)}`, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined, members: { create: { userId, role: body.role ?? "seller" } } }, include: { coffeeLot: true } });
export const getRoom = (roomCode: string) => prisma.inspectionRoom.findUnique({ where: { roomCode }, include: { coffeeLot: true, members: true, requests: true, inspections: { include: { detections: true } }, reports: true } });
export const joinRoom = (roomCode: string, userId: number, role: string) => prisma.inspectionRoom.findUnique({ where: { roomCode } }).then(async (room) => { if (!room) return null; await prisma.roomMember.upsert({ where: { roomId_userId: { roomId: room.id, userId } }, update: { role }, create: { roomId: room.id, userId, role } }); return prisma.inspectionRoom.update({ where: { id: room.id }, data: { status: "active" } }); });
export const createRequest = (roomCode: string, userId: number, body: any) => prisma.inspectionRoom.update({ where: { roomCode }, data: { requests: { create: { requestedBy: userId, requestType: body.requestType, message: body.message } } }, include: { requests: true } });
export const createInspection = (roomCode: string, userId: number, body: any) => prisma.inspection.create({ data: { room: { connect: { roomCode } }, capturer: { connect: { id: userId } }, sampleNumber: Number(body.sampleNumber), layer: body.layer, imageUrl: body.imageUrl, modelVersion: body.modelVersion, qualityScore: body.qualityScore, healthyPercent: body.healthyPercent, damagedPercent: body.damagedPercent, insectDamagePercent: body.insectDamagePercent, confidencePercent: body.confidencePercent, detections: { create: body.detections ?? [] } }, include: { detections: true } });
export const createReport = (roomCode: string, userId: number, body: any) => prisma.report.create({ data: { room: { connect: { roomCode } }, generator: { connect: { id: userId } }, finalQualityScore: body.finalQualityScore, summary: body.summary, pdfUrl: body.pdfUrl } });
