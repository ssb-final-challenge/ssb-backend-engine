import type { RequestHandler } from "express";
import { loginUser, registerUser } from "../services/auth-service.js";

const register: RequestHandler = async (req, res) => {
  try { res.status(201).json({ user: await registerUser(req.body) }); }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Registration failed" }); }
};
const login: RequestHandler = async (req, res) => {
  try { res.json({ user: await loginUser(req.body.email, req.body.password) }); }
  catch (error) { res.status(401).json({ error: error instanceof Error ? error.message : "Login failed" }); }
};
export default { register, login };
