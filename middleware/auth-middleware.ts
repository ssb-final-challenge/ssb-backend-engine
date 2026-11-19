import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { failure } from "../lib/http-response.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  namespace Express { interface Request { user?: { id: number; name: string; email: string; role: string }; authRole?: string; } }
}

export const requireUser: RequestHandler = async (req, res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    failure(res, 401, "Masuk untuk melanjutkan.", "AUTH_REQUIRED");
    return;
  }
  let id: number;
  try {
    id = Number(verifyAccessToken(header.slice(7)).sub);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid subject");
  } catch {
    failure(res, 401, "Sesi akun telah habis. Masuk kembali.", "AUTH_EXPIRED");
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id }, select: { id: true, name: true, email: true, role: true }
    });
    if (!user) {
      failure(res, 401, "Akun tidak ditemukan. Masuk kembali.", "AUTH_INVALID");
      return;
    }
    req.user = user;
    req.authRole = user.role;
  } catch {
    failure(res, 503, "Layanan akun sedang bermasalah. Coba lagi nanti.", "AUTH_UNAVAILABLE");
    return;
  }
  next();
};

export const optionalUser: RequestHandler = (req, res, next) => {
  if (req.header("authorization")) return requireUser(req, res, next);
  next();
};

export const requireRole = (...roles: string[]): RequestHandler => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) { failure(res, 403, "Akun ini tidak memiliki izin untuk tindakan tersebut.", "ROLE_REQUIRED"); return; }
  next();
};
