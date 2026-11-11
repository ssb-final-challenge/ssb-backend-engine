import express from "express";
import authController from "../controller/auth-controller.js";

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/register", authController.register);
authRouter.post("/apple", authController.apple);

export default authRouter;
