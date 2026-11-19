import express from "express";
import controller from "../controller/inspection-controller.js";
import { optionalUser, requireRole, requireUser } from "../middleware/auth-middleware.js";

const inspectionRouter = express.Router();
inspectionRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
inspectionRouter.post("/rooms/:roomCode/join", optionalUser, controller.joinRoom);
inspectionRouter.post("/livekit/token", optionalUser, controller.createLiveKitToken);
inspectionRouter.post("/rooms/:roomCode/status", optionalUser, controller.getRoomStatus);
inspectionRouter.use(requireUser);
inspectionRouter.post("/guest-sessions/claim", requireRole("buyer"), controller.claimGuestSession);
inspectionRouter.get("/lots", controller.listLots);
inspectionRouter.get("/lots/:id", controller.getLot);
inspectionRouter.post("/lots", requireRole("farmer", "seller"), controller.createLot);
inspectionRouter.get("/history", controller.getAllHistories);
inspectionRouter.get("/history/:id", controller.getHistoryById);
inspectionRouter.post("/rooms", requireRole("farmer", "seller"), controller.createRoom);
inspectionRouter.get("/rooms/recent", controller.getRecentRooms);
inspectionRouter.get("/rooms/available", controller.getAvailableRooms);
inspectionRouter.post("/rooms/:roomCode/complete", requireRole("farmer", "seller"), controller.completeRoom);
inspectionRouter.post("/rooms/:roomCode/leave", controller.leaveRoom);
inspectionRouter.get("/rooms/:roomCode", controller.getRoom);
inspectionRouter.post("/rooms/:roomCode/requests", controller.createRequest);
inspectionRouter.post("/rooms/:roomCode/inspections", requireRole("farmer", "seller"), controller.createInspection);
inspectionRouter.post("/rooms/:roomCode/reports", requireRole("farmer", "seller"), controller.createReport);

export default inspectionRouter;
