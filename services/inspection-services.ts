import { uploadInspectionImage } from "../lib/supabase-storage.js";
import { APIError } from "../lib/http-response.js";
import { prisma } from "../lib/prisma.js";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

type Participant = { id?: number; name: string; role: string };
const isSeller = (role: string) => role === "farmer" || role === "seller";
const roomInclude = {
  coffeeLot: { include: { seller: { select: { id: true, name: true } } } },
  members: { select: { id: true, userId: true, role: true, displayName: true, joinedAt: true, leftAt: true } },
  requests: true,
  inspections: { include: { detections: true } },
  reports: true
} as const;

export async function createLiveKitToken(user: Participant, roomName: string, identity?: string) {
  const serverUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!serverUrl || !apiKey || !apiSecret) {
    throw new APIError(503, "LIVEKIT_UNAVAILABLE", "Layanan ruang observasi belum tersedia. Coba lagi nanti.");
  }
  const role = isSeller(user.role) ? "farmer" : user.role;
  const token = new AccessToken(apiKey, apiSecret, {
    identity: identity ?? String(user.id), name: user.name, ttl: "2h",
    metadata: JSON.stringify({ role })
  });
  token.addGrant({
    roomJoin: true, room: roomName, canPublish: true,
    canPublishSources: role === "farmer" ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [TrackSource.MICROPHONE],
    canPublishData: role === "farmer", canSubscribe: true
  });
  return { serverUrl, participantToken: await token.toJwt(), roomName, role };
}

export async function createGuestLiveKitToken(roomName: string, guestSessionId: string) {
  const member = await prisma.roomMember.findFirst({
    where: { guestSessionId, room: { roomCode: roomName } }, include: { room: true }
  });
  if (!member || member.userId !== null) {
    throw new APIError(403, "GUEST_SESSION_INVALID", "Sesi tamu tidak berlaku. Gabung kembali ke ruang.");
  }
  if (member.room.status === "completed") throw roomEnded();
  return createLiveKitToken({ name: member.displayName ?? "Pembeli", role: "guest" }, roomName, `guest-${guestSessionId}`);
}

export async function createUserLiveKitToken(userId: number, roomName: string) {
  const member = await prisma.roomMember.findFirst({
    where: { userId, room: { roomCode: roomName } }, include: { user: true, room: true }
  });
  if (!member?.user) throw new APIError(403, "ROOM_ACCESS_DENIED", "Gabung ke ruang sebelum menyambungkan panggilan.");
  if (member.room.status === "completed") throw roomEnded();
  return createLiveKitToken(member.user, roomName);
}

const roomEnded = () => new APIError(409, "ROOM_COMPLETED", "Sesi observasi sudah berakhir.");
const roomAccess = (userId: number): Prisma.InspectionRoomWhereInput => ({
  OR: [{ coffeeLot: { sellerId: userId } }, { members: { some: { userId } } }]
});

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
      ...roomAccess(filters.userId),
      ...(filters.roomCode ? { roomCode: filters.roomCode } : {}),
      ...(filters.coffeeLotId ? { coffeeLotId: filters.coffeeLotId } : {})
    }
  };
  return prisma.inspection.findMany({ where, include: { detections: true, room: { include: { coffeeLot: true } } }, orderBy: { createdAt: "desc" } });
};
export const getHistoryById = (id: number, userId: number) => prisma.inspection.findFirst({
  where: { id, room: roomAccess(userId) }, include: { detections: true, room: { include: { coffeeLot: true } } }
});
const COFFEE_VARIETIES = ["Arabica", "Robusta"] as const;

const normalizeVariety = (value: unknown) => {
  if (typeof value !== "string") throw new APIError(400, "INVALID_COMMODITY", "Pilih jenis kopi Arabika atau Robusta.");
  const variety = COFFEE_VARIETIES.find((item) => item.toLowerCase() === value.trim().toLowerCase());
  if (!variety) throw new APIError(400, "INVALID_COMMODITY", "Pilih jenis kopi Arabika atau Robusta.");
  return variety;
};

export const createRoom = (userId: number, body: any) => prisma.$transaction(async (tx) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (!isSeller(user.role)) throw new APIError(403, "HOST_REQUIRED", "Hanya penjual yang dapat membuat ruang.");
  let coffeeLotId: number;
  if (body.coffeeLotId !== undefined) {
    coffeeLotId = Number(body.coffeeLotId);
    if (!Number.isSafeInteger(coffeeLotId) || coffeeLotId <= 0) {
      throw new APIError(400, "INVALID_LOT", "Lot kopi tidak valid.");
    }
    const lot = await tx.coffeeLot.findFirst({ where: { id: coffeeLotId, sellerId: userId } });
    if (!lot) throw new APIError(403, "LOT_ACCESS_DENIED", "Lot kopi ini milik penjual lain.");
  } else {
    const variety = normalizeVariety(body.commodity ?? body.variety);
    const lot = await tx.coffeeLot.create({ data: {
      sellerId: userId, lotCode: `AUTO-${randomUUID()}`, name: `${variety} Coffee`,
      variety, origin: "Unknown", quantityKg: 0
    } });
    coffeeLotId = lot.id;
  }
  let scheduledAt: Date | undefined;
  if (body.scheduledAt !== undefined) {
    scheduledAt = new Date(body.scheduledAt);
    if (!Number.isFinite(scheduledAt.getTime())) throw new APIError(400, "INVALID_DATE", "Tanggal sesi tidak valid.");
  }
  return tx.inspectionRoom.create({
    data: {
      coffeeLotId, roomCode: `room-${Date.now().toString(36)}`, scheduledAt,
      members: { create: { userId, role: user.role } }
    },
    include: { coffeeLot: roomInclude.coffeeLot }
  });
});
export const getRoom = (roomCode: string, userId: number) => prisma.inspectionRoom.findFirst({
  where: { roomCode, ...roomAccess(userId) }, include: roomInclude
});
export const getRecentRooms = (userId: number) => prisma.inspectionRoom.findMany({
  where: { status: { in: ["scheduled", "active"] }, ...roomAccess(userId) },
  include: { coffeeLot: roomInclude.coffeeLot }, orderBy: { createdAt: "desc" }, take: 20
});
export const getAvailableRooms = () => prisma.inspectionRoom.findMany({
  where: { status: { in: ["scheduled", "active"] } },
  include: { coffeeLot: roomInclude.coffeeLot }, orderBy: { createdAt: "desc" }, take: 50
});

async function lockRoom(tx: Prisma.TransactionClient, roomCode: string) {
  // Serialize joins, claims, and result writes against this room.
  await tx.$queryRaw`SELECT id FROM inspection_rooms WHERE room_code = ${roomCode} FOR UPDATE`;
  const room = await tx.inspectionRoom.findUnique({ where: { roomCode }, include: { coffeeLot: true } });
  if (!room) throw new APIError(404, "ROOM_NOT_FOUND", "Ruang tidak ditemukan.");
  return room;
}

async function requireHost(tx: Prisma.TransactionClient, roomCode: string, userId: number) {
  const room = await lockRoom(tx, roomCode);
  if (room.coffeeLot.sellerId !== userId) {
    throw new APIError(403, "HOST_REQUIRED", "Hanya penjual pemilik ruang yang dapat menyimpan hasil atau mengakhiri sesi.");
  }
  return room;
}

export const joinRoom = async (roomCode: string, userId: number | null, role: string, displayName?: string, guestSessionId?: string) =>
  prisma.$transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);
    if (room.status === "completed") throw roomEnded();
    if (userId !== null) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (isSeller(user.role) && room.coffeeLot.sellerId !== userId) {
        throw new APIError(403, "ROOM_ACCESS_DENIED", "Ruang ini milik penjual lain.");
      }
      const member = await tx.roomMember.findFirst({ where: { roomId: room.id, userId } });
      if (member) await tx.roomMember.update({ where: { id: member.id }, data: { leftAt: null } });
      else await tx.roomMember.create({ data: { roomId: room.id, userId, role: user.role } });
      const joined = await tx.inspectionRoom.update({ where: { id: room.id }, data: { status: "active" }, include: { coffeeLot: roomInclude.coffeeLot } });
      return { ...joined, livekit: await createLiveKitToken(user, roomCode) };
    }

    const name = typeof displayName === "string" ? displayName.trim() : "";
    if (!name || name.length > 100) throw new APIError(400, "INVALID_NAME", "Isi nama panggilan, maksimal 100 karakter.");
    const existing = guestSessionId ? await tx.roomMember.findUnique({ where: { guestSessionId } }) : null;
    if (guestSessionId && (!existing || existing.roomId !== room.id || existing.userId !== null)) {
      throw new APIError(403, "GUEST_SESSION_INVALID", "Sesi tamu tidak berlaku. Gabung kembali ke ruang.");
    }
    const sessionId = existing?.guestSessionId ?? randomUUID();
    if (existing) await tx.roomMember.update({ where: { id: existing.id }, data: { displayName: name, leftAt: null } });
    else await tx.roomMember.create({ data: { roomId: room.id, role: "guest", displayName: name, guestSessionId: sessionId } });
    const joined = await tx.inspectionRoom.update({ where: { id: room.id }, data: { status: "active" }, include: { coffeeLot: roomInclude.coffeeLot } });
    return { ...joined, guestSessionId: sessionId, livekit: await createLiveKitToken({ name, role: "guest" }, roomCode, `guest-${sessionId}`) };
  });

export const claimGuestSession = async (sessionId: string, userId: number) => {
  const member = await prisma.roomMember.findUnique({ where: { guestSessionId: sessionId } });
  if (!member) throw new APIError(404, "GUEST_SESSION_NOT_FOUND", "Sesi tamu tidak ditemukan.");
  const room = await prisma.inspectionRoom.findUniqueOrThrow({ where: { id: member.roomId } });
  return prisma.$transaction(async (tx) => {
    await lockRoom(tx, room.roomCode);
    const current = await tx.roomMember.findUniqueOrThrow({ where: { id: member.id } });
    if (current.userId !== null && current.userId !== userId) {
      throw new APIError(403, "GUEST_SESSION_CLAIMED", "Riwayat ini sudah terhubung ke akun lain.");
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== "buyer") throw new APIError(403, "BUYER_REQUIRED", "Gunakan akun pembeli untuk menyimpan riwayat.");
    const inspectionCount = await tx.inspection.count({ where: { roomId: room.id } });
    if (!inspectionCount) throw new APIError(409, "HISTORY_NOT_READY", "Hasil belum tersimpan oleh penjual. Tunggu sebentar lalu coba lagi.");
    await tx.roomMember.update({ where: { id: member.id }, data: { userId, role: "buyer" } });
    return { roomCode: room.roomCode, inspectionCount };
  });
};

export const getRoomStatus = async (roomCode: string, userId?: number, guestSessionId?: string) => {
  const room = await prisma.inspectionRoom.findFirst({
    where: {
      roomCode,
      ...(userId ? roomAccess(userId) : { members: { some: { guestSessionId: guestSessionId ?? "", userId: null } } })
    },
    select: { roomCode: true, status: true, finalResult: true }
  });
  if (!room) throw new APIError(403, "ROOM_ACCESS_DENIED", "Sesi ini tidak memiliki akses ke ruang.");
  return { roomCode: room.roomCode, status: room.status, result: room.finalResult };
};

export const leaveRoom = async (roomCode: string, userId: number) => {
  const room = await getRoom(roomCode, userId);
  if (!room) return null;
  await prisma.roomMember.updateMany({ where: { roomId: room.id, userId }, data: { leftAt: new Date() } });
  return { roomCode, status: room.status };
};

type InspectionImage = { imageUrl: string; imagePath?: string };

function inspectionData(roomId: number, userId: number, body: any, image: InspectionImage) {
  if (!Number.isSafeInteger(body.sampleNumber) || body.sampleNumber < 1 ||
      typeof body.layer !== "string" || !body.layer || body.layer.length > 20 ||
      typeof body.modelVersion !== "string" || !body.modelVersion || body.modelVersion.length > 50) {
    throw new APIError(400, "INVALID_SAMPLE", "Nomor, sisi, atau versi model sampel tidak valid.");
  }
  for (const field of ["qualityScore", "healthyPercent", "damagedPercent", "insectDamagePercent", "confidencePercent"]) {
    if (typeof body[field] !== "number" || !Number.isFinite(body[field]) || body[field] < 0 || body[field] > 100) {
      throw new APIError(400, "INVALID_RESULT", "Persentase hasil inspeksi harus antara 0 dan 100.");
    }
  }
  const detections = body.detections ?? [];
  if (!Array.isArray(detections) || detections.length > 100_000 ||
      detections.some((item: any) => !item || typeof item.label !== "string" ||
        !item.label || item.label.length > 100 ||
        ["confidence", "x", "y", "width", "height"].some(field =>
          typeof item[field] !== "number" || !Number.isFinite(item[field]) || item[field] < 0 || item[field] > 1))) {
    throw new APIError(400, "INVALID_DETECTIONS", "Data deteksi sampel tidak valid.");
  }
  return {
    roomId, capturedBy: userId, sampleNumber: body.sampleNumber, layer: body.layer,
    imageUrl: image.imageUrl, imagePath: image.imagePath,
    modelVersion: body.modelVersion, qualityScore: body.qualityScore,
    healthyPercent: body.healthyPercent, damagedPercent: body.damagedPercent,
    insectDamagePercent: body.insectDamagePercent, confidencePercent: body.confidencePercent,
    detections: { create: detections.map((item: any) => ({
      label: item.label, confidence: item.confidence, x: item.x, y: item.y, width: item.width, height: item.height
    })) }
  };
}

async function prepareImage(roomCode: string, userId: number, body: any): Promise<InspectionImage> {
  if (body.imageBase64 !== undefined) {
    return uploadInspectionImage(body.imageBase64, body.imageContentType ?? "image/jpeg", userId, roomCode);
  }
  if (typeof body.imageUrl !== "string" || !body.imageUrl || body.imageUrl.length > 500 ||
      !/^https?:\/\//i.test(body.imageUrl)) {
    throw new APIError(400, "INVALID_IMAGE", "Kirim gambar sampel atau URL gambar yang valid.");
  }
  if (body.imagePath !== undefined && (typeof body.imagePath !== "string" || body.imagePath.length > 500)) {
    throw new APIError(400, "INVALID_IMAGE", "Lokasi gambar sampel tidak valid.");
  }
  return { imageUrl: body.imageUrl, imagePath: body.imagePath };
}

async function hostRoom(roomCode: string, userId: number) {
  const room = await prisma.inspectionRoom.findUnique({ where: { roomCode }, include: { coffeeLot: true } });
  if (!room) throw new APIError(404, "ROOM_NOT_FOUND", "Ruang tidak ditemukan.");
  if (room.coffeeLot.sellerId !== userId) {
    throw new APIError(403, "HOST_REQUIRED", "Hanya penjual pemilik ruang yang dapat menyimpan hasil atau mengakhiri sesi.");
  }
  return room;
}

function reportData(roomId: number, userId: number, body: any) {
  if (typeof body.summary !== "string" || !body.summary || body.summary.length > 10_000 ||
      typeof body.finalQualityScore !== "number" || !Number.isFinite(body.finalQualityScore) ||
      body.finalQualityScore < 0 || body.finalQualityScore > 100 ||
      (body.pdfUrl != null && (typeof body.pdfUrl !== "string" || body.pdfUrl.length > 500))) {
    throw new APIError(400, "INVALID_REPORT", "Ringkasan atau nilai laporan tidak valid.");
  }
  return { roomId, generatedBy: userId, finalQualityScore: body.finalQualityScore, summary: body.summary, pdfUrl: body.pdfUrl };
}

function completionResult(body: any): Prisma.InputJsonValue | undefined {
  if (body.result === undefined) return undefined;
  const result = body.result;
  if (!result || typeof result.grade !== "string" || !result.grade || result.grade.length > 100 ||
      !Number.isInteger(result.totalBeans) || result.totalBeans < 0 || result.totalBeans > 100_000 ||
      !Number.isInteger(result.healthyBeans) || result.healthyBeans < 0 || result.healthyBeans > result.totalBeans ||
      !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 100 ||
      !Array.isArray(result.defects) || result.defects.length > 32 ||
      result.defects.some((defect: any) =>
        !defect || typeof defect.id !== "string" || typeof defect.name !== "string" ||
        !Array.isArray(defect.details) || defect.details.length > 32 ||
        defect.details.some((detail: any) =>
          !detail || typeof detail.id !== "string" || typeof detail.name !== "string" ||
          !Number.isInteger(detail.count) || detail.count < 0 || detail.count > 100_000)) ||
      result.defects.flatMap((defect: any) => defect.details)
        .reduce((sum: number, detail: any) => sum + detail.count, 0) > result.totalBeans ||
      JSON.stringify(result).length > 12_000) {
    throw new APIError(400, "INVALID_RESULT", "Hasil akhir inspeksi tidak valid.");
  }
  return result;
}

export const completeRoom = async (roomCode: string, userId: number, body: any = {}) => {
  const current = await hostRoom(roomCode, userId);
  if (current.status === "completed") return { roomCode, status: current.status };
  if (Boolean(body.inspection) !== Boolean(body.report)) {
    throw new APIError(400, "INVALID_RESULT", "Kirim hasil inspeksi dan ringkasan laporan bersama.");
  }
  const finalResult = completionResult(body);
  let image: InspectionImage | undefined;
  if (body.inspection) {
    // Validate all DB input before uploading. Do not keep a row lock during network I/O.
    inspectionData(current.id, userId, body.inspection, { imageUrl: "" });
    reportData(current.id, userId, body.report);
    image = await prepareImage(roomCode, userId, body.inspection);
  }
  return prisma.$transaction(async (tx) => {
    const room = await requireHost(tx, roomCode, userId);
    if (room.status === "completed") return { roomCode, status: room.status };
    if (body.inspection && image) {
      await tx.inspection.create({ data: inspectionData(room.id, userId, body.inspection, image) });
      await tx.report.create({ data: reportData(room.id, userId, body.report) });
    }
    await tx.inspectionRoom.update({ where: { id: room.id }, data: { status: "completed", finalResult } });
    return { roomCode, status: "completed" };
  });
};

export const createRequest = async (roomCode: string, userId: number, body: any) => {
  const room = await getRoom(roomCode, userId);
  if (!room) throw new APIError(403, "ROOM_ACCESS_DENIED", "Gabung ke ruang sebelum membuat permintaan.");
  if (room.status === "completed") throw roomEnded();
  return prisma.inspectionRoom.update({ where: { id: room.id }, data: { requests: { create: { requestedBy: userId, requestType: body.requestType, message: body.message } } }, include: { requests: true } });
};
export const createInspection = async (roomCode: string, userId: number, body: any) => {
  const current = await hostRoom(roomCode, userId);
  inspectionData(current.id, userId, body, { imageUrl: "" });
  const image = await prepareImage(roomCode, userId, body);
  return prisma.$transaction(async (tx) => {
    const room = await requireHost(tx, roomCode, userId);
    return tx.inspection.create({ data: inspectionData(room.id, userId, body, image), include: { detections: true } });
  });
};
export const createReport = (roomCode: string, userId: number, body: any) =>
  prisma.$transaction(async (tx) => {
    const room = await requireHost(tx, roomCode, userId);
    return tx.report.create({ data: reportData(room.id, userId, body) });
  });
