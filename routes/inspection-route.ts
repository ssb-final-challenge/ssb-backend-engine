import express from "express";
import controller from "../controller/inspection-controller.js";
import { optionalUser, requireUser } from "../middleware/auth-middleware.js";

const inspectionRouter = express.Router();
inspectionRouter.post("/rooms/:roomCode/join", optionalUser, controller.joinRoom);
inspectionRouter.post("/livekit/token", optionalUser, controller.createLiveKitToken);
inspectionRouter.use(requireUser);
inspectionRouter.get("/lots", controller.listLots);
inspectionRouter.get("/lots/:id", controller.getLot);
inspectionRouter.post("/lots", controller.createLot);
inspectionRouter.get("/history", controller.getAllHistories);
inspectionRouter.get("/history/:id", controller.getHistoryById);
inspectionRouter.post("/rooms", controller.createRoom);
inspectionRouter.get("/rooms/recent", controller.getRecentRooms);
inspectionRouter.get("/rooms/available", controller.getAvailableRooms);
inspectionRouter.post("/rooms/:roomCode/complete", controller.completeRoom);
inspectionRouter.post("/rooms/:roomCode/leave", controller.leaveRoom);
inspectionRouter.get("/rooms/:roomCode", controller.getRoom);
inspectionRouter.post("/rooms/:roomCode/requests", controller.createRequest);
inspectionRouter.post("/rooms/:roomCode/inspections", controller.createInspection);
inspectionRouter.post("/rooms/:roomCode/reports", controller.createReport);

export default inspectionRouter;
