import express from "express";
import controller from "../controller/inspection-controller.js";
import { requireUser } from "../middleware/auth-middleware.js";

const inspectionRouter = express.Router();
inspectionRouter.use(requireUser);
inspectionRouter.post("/livekit/token", controller.createLiveKitToken);
inspectionRouter.get("/lots", controller.listLots);
inspectionRouter.get("/lots/:id", controller.getLot);
inspectionRouter.post("/lots", controller.createLot);
inspectionRouter.get("/history", controller.getAllHistories);
inspectionRouter.get("/history/:id", controller.getHistoryById);
inspectionRouter.post("/rooms", controller.createRoom);
inspectionRouter.get("/rooms/:roomCode", controller.getRoom);
inspectionRouter.post("/rooms/:roomCode/join", controller.joinRoom);
inspectionRouter.post("/rooms/:roomCode/requests", controller.createRequest);
inspectionRouter.post("/rooms/:roomCode/inspections", controller.createInspection);
inspectionRouter.post("/rooms/:roomCode/reports", controller.createReport);

export default inspectionRouter;
