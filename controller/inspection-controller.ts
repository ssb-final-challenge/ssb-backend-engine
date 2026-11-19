import { Prisma } from "@prisma/client";
import type { RequestHandler } from "express";
import * as service from "../services/inspection-services.js";
import { APIError, failure, success } from "../lib/http-response.js";

type AuthRequest = Parameters<RequestHandler>[0] & { user?: { id: number; name: string; role: string }; authRole?: string };
const userId = (req: AuthRequest) => req.user?.id;
const param = (req: AuthRequest, name: string) => String(req.params[name]);
const queryValue = (req: AuthRequest, name: string) => typeof req.query[name] === "string" ? req.query[name] as string : undefined;
const positiveQuery = (req: AuthRequest, name: string) => {
  const value = queryValue(req, name);
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new APIError(400, "INVALID_FILTER", `Filter ${name} harus berupa bilangan positif.`);
  }
  return number;
};
const dateQuery = (req: AuthRequest, name: string) => {
  const value = queryValue(req, name);
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new APIError(400, "INVALID_FILTER", `Tanggal ${name} tidak valid.`);
  return date;
};
const historyFilters = (req: AuthRequest) => {
  const from = dateQuery(req, "from");
  const to = dateQuery(req, "to");
  if (from && to && from > to) throw new APIError(400, "INVALID_FILTER", "Tanggal awal harus sebelum tanggal akhir.");
  return {
    userId: userId(req)!, roomCode: queryValue(req, "roomCode"),
    coffeeLotId: positiveQuery(req, "coffeeLotId"), capturedBy: positiveQuery(req, "capturedBy"),
    sampleNumber: positiveQuery(req, "sampleNumber"), from, to
  };
};
const execute = (operation: (req: AuthRequest) => Promise<unknown>, status = 200, message = "Success"): RequestHandler => async (req, res) => {
  try {
    if (req.method !== "GET" && req.body !== undefined &&
        (req.body === null || Array.isArray(req.body) || typeof req.body !== "object")) {
      throw new APIError(400, "INVALID_INPUT", "Kirim data permintaan dalam format objek.");
    }
    const data = await operation(req as AuthRequest);
    if (data === null) { failure(res, 404, "Data tidak ditemukan.", "NOT_FOUND"); return; }
    success(res, data, status, message);
  } catch (error) {
    if (error instanceof APIError) { failure(res, error.status, error.message, error.code); return; }
    if (error instanceof Prisma.PrismaClientValidationError) {
      failure(res, 400, "Data permintaan tidak lengkap atau tidak valid.", "INVALID_INPUT");
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") { failure(res, 409, "Data ini sudah tersimpan.", "ALREADY_EXISTS"); return; }
      if (error.code === "P2025") { failure(res, 404, "Data tidak ditemukan.", "NOT_FOUND"); return; }
      if (["P2000", "P2003"].includes(error.code)) {
        failure(res, 400, "Data permintaan tidak valid.", "INVALID_INPUT"); return;
      }
    }
    failure(res, 500, "Layanan gagal memproses permintaan. Coba lagi nanti.", "INTERNAL_ERROR");
  }
};

const createLiveKitToken = execute(async (req) => {
  if (typeof req.body?.roomName !== "string") throw new APIError(400, "ROOM_REQUIRED", "Kode ruang diperlukan.");
  if (req.user) return service.createUserLiveKitToken(req.user.id, req.body.roomName);
  if (typeof req.body?.guestSessionId !== "string") throw new APIError(401, "GUEST_SESSION_REQUIRED", "Sesi akun atau tamu diperlukan.");
  return service.createGuestLiveKitToken(req.body.roomName, req.body.guestSessionId);
});

export default {
  createLiveKitToken,
  listLots: execute(() => service.listLots()),
  getLot: execute((req) => service.getLot(Number(req.params.id))),
  createLot: execute((req) => service.createLot(userId(req)!, req.body), 201, "Lot created"),
  getAllHistories: execute((req) => service.getAllHistories(historyFilters(req))),
  getHistoryById: execute((req) => service.getHistoryById(Number(req.params.id), userId(req)!)),
  createRoom: execute((req) => service.createRoom(userId(req)!, { ...req.body, role: req.user?.role }), 201, "Room created"),
  getRoom: execute((req) => service.getRoom(param(req, "roomCode"), userId(req)!)),
  getRecentRooms: execute((req) => service.getRecentRooms(userId(req)!)),
  getAvailableRooms: execute(() => service.getAvailableRooms()),
  completeRoom: execute((req) => service.completeRoom(param(req, "roomCode"), userId(req)!, req.body), 200, "Room completed"),
  claimGuestSession: execute((req) => {
    if (typeof req.body?.guestSessionId !== "string" || !req.body.guestSessionId) {
      throw new APIError(400, "GUEST_SESSION_REQUIRED", "Sesi tamu diperlukan.");
    }
    return service.claimGuestSession(req.body.guestSessionId, userId(req)!);
  }),
  getRoomStatus: execute((req) => service.getRoomStatus(param(req, "roomCode"), userId(req), req.body?.guestSessionId)),
  leaveRoom: execute((req) => service.leaveRoom(param(req, "roomCode"), userId(req)!), 200, "Left room"),
  joinRoom: execute((req) => {
    if (req.body?.guestSessionId !== undefined &&
        (typeof req.body.guestSessionId !== "string" || !req.body.guestSessionId || req.body.guestSessionId.length > 100)) {
      throw new APIError(400, "GUEST_SESSION_INVALID", "Sesi tamu tidak valid.");
    }
    const role = req.authRole ?? req.user?.role ?? req.body?.role;
    if (!role || !["farmer", "seller", "buyer", "guest"].includes(role)) throw new APIError(400, "ROLE_REQUIRED", "Masuk atau pilih pembeli tamu.");
    if (!req.user && role !== "guest") throw new APIError(401, "AUTH_REQUIRED", "Masuk atau pilih pembeli tamu.");
    return service.joinRoom(param(req, "roomCode"), req.user?.id ?? null, role, req.body?.displayName, req.body?.guestSessionId);
  }, 200, "Joined room"),
  createRequest: execute((req) => service.createRequest(param(req, "roomCode"), userId(req)!, req.body), 201, "Request created"),
  createInspection: execute((req) => service.createInspection(param(req, "roomCode"), userId(req)!, req.body), 201, "Inspection created"),
  createReport: execute((req) => service.createReport(param(req, "roomCode"), userId(req)!, req.body), 201, "Report created")
};
