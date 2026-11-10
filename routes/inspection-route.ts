import express from "express";
import controller from "../controller/inspection-controller.js";

const router = express.Router();
router.get("/history", controller.getAllHistories);
router.get("/history/:id", controller.getHistoryById);
router.post("/rooms", controller.createRoom);
router.get("/rooms/:roomCode", controller.getRoom);
router.post("/rooms/:roomCode/join", controller.joinRoom);
router.post("/room~s/:roomCode/requests", controller.createRequest);
router.post("/rooms/:roomCode/inspections", controller.createInspection);
router.post("/rooms/:roomCode/reports", controller.createReport);
export default router;
