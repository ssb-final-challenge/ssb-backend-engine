import type { RequestHandler } from "express";
import { loginUser, registerUser } from "../services/auth-service.js";
import { errorMessage, failure, success } from "../lib/http-response.js";

const register: RequestHandler = async (req, res) => {
  try { success(res, await registerUser(req.body), 201, "Registration successful"); }
  catch (error) { failure(res, 400, errorMessage(error, "Registration failed"), "REGISTRATION_FAILED"); }
};
const login: RequestHandler = async (req, res) => {
  try { success(res, await loginUser(req.body.email, req.body.password), 200, "Login successful"); }
  catch (error) { failure(res, 401, errorMessage(error, "Login failed"), "INVALID_CREDENTIALS"); }
};
export default { register, login };
