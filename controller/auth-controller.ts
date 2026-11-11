import type { RequestHandler } from "express";
import { loginUser, registerUser, signInWithApple } from "../services/auth-service.js";
import { errorMessage, failure, success } from "../lib/http-response.js";

const register: RequestHandler = async (req, res) => {
  try { success(res, await registerUser(req.body), 201, "Registration successful"); }
  catch (error) { failure(res, 400, errorMessage(error, "Registration failed"), "REGISTRATION_FAILED"); }
};
const login: RequestHandler = async (req, res) => {
  try { success(res, await loginUser(req.body.email, req.body.password), 200, "Login successful"); }
  catch (error) { failure(res, 401, errorMessage(error, "Login failed"), "INVALID_CREDENTIALS"); }
};
const apple: RequestHandler = async (req, res) => {
  try {
    const result = await signInWithApple({ identityToken: req.body.identity_token, appleUserId: req.body.apple_user_id, nonce: req.body.nonce, name: req.body.name, email: req.body.email, role: req.body.role });
    success(res, result, 200, "Apple sign-in successful");
  } catch {
    failure(res, 401, "Invalid Apple identity token", "APPLE_AUTH_FAILED");
  }
};
export default { register, login, apple };
