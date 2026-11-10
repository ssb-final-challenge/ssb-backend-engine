import type { RequestHandler } from "express";
import * as service from "../services/inspection-services.js";
import { errorMessage, failure, success } from "../lib/http-response.js";

type AuthRequest = Parameters<RequestHandler>[0] & { user?: { id: number; name: string; role: string } };
const userId = (req: AuthRequest) => req.user?.id;
const param = (req: AuthRequest, name: string) => String(req.params[name]);
const execute = (operation: (req: AuthRequest) => Promise<unknown>, status = 200, message = "Success"): RequestHandler => async (req, res) => {
  try {
    const data = await operation(req as AuthRequest);
    if (data === null) { failure(res, 404, "Resource not found", "NOT_FOUND"); return; }
    success(res, data, status, message);
  } catch (error) { failure(res, 400, errorMessage(error, "Request failed")); }
};

const createLiveKitToken = execute(async (req) => {
  if (!req.user || typeof req.body?.roomName !== "string") throw new Error("roomName is required");
  return service.createLiveKitToken(req.user, req.body.roomName);
});

export default {
  createLiveKitToken,
  listLots: execute(() => service.listLots()),
  getLot: execute((req) => service.getLot(Number(req.params.id))),
  createLot: execute((req) => service.createLot(userId(req)!, req.body), 201, "Lot created"),
  getAllHistories: execute(() => service.getAllHistories()),
  getHistoryById: execute((req) => service.getHistoryById(Number(req.params.id))),
  createRoom: execute((req) => service.createRoom(userId(req)!, req.body), 201, "Room created"),
  getRoom: execute((req) => service.getRoom(param(req, "roomCode"))),
  joinRoom: execute((req) => service.joinRoom(param(req, "roomCode"), userId(req)!, req.body.role ?? "buyer"), 200, "Joined room"),
  createRequest: execute((req) => service.createRequest(param(req, "roomCode"), userId(req)!, req.body), 201, "Request created"),
  createInspection: execute((req) => service.createInspection(param(req, "roomCode"), userId(req)!, req.body), 201, "Inspection created"),
  createReport: execute((req) => service.createReport(param(req, "roomCode"), userId(req)!, req.body), 201, "Report created")
};
