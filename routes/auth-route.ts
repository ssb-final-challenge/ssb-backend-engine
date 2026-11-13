import express from "express";
import authController from "../controller/auth-controller.js";
import { requireUser } from "../middleware/auth-middleware.js";

const authRouter = express.Router();
authRouter.post("/login", authController.login);
authRouter.post("/register", authController.register);
authRouter.post("/apple", authController.apple);
authRouter.delete("/account", requireUser, authController.deleteUserAccount);

export default authRouter;
