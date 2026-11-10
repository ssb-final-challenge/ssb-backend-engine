import type { RequestHandler } from "express";
import * as service from "../services/inspection-services.js";

const uid = (req: any) => Number(req.header("x-user-id"));
const handler = (fn: (req: any) => Promise<unknown>): RequestHandler => async (req, res) => { try { const result = await fn(req); if (result === null) return void res.status(404).json({ error: "Not found" }); res.json(result); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Request failed" }); } };

export default {
  getAllHistories: handler(() => service.getAllHistories()),
  getHistoryById: handler((req) => service.getHistoryById(Number(req.params.id))),
  createRoom: handler((req) => service.createRoom(uid(req), req.body)),
  getRoom: handler((req) => service.getRoom(req.params.roomCode)),
  joinRoom: handler((req) => service.joinRoom(req.params.roomCode, uid(req), req.body.role ?? "buyer")),
  createRequest: handler((req) => service.createRequest(req.params.roomCode, uid(req), req.body)),
  createInspection: handler((req) => service.createInspection(req.params.roomCode, uid(req), req.body)),
  createReport: handler((req) => service.createReport(req.params.roomCode, uid(req), req.body))
};
