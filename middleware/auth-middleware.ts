import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  namespace Express { interface Request { user?: { id: number; name: string; email: string; role: string }; } }
}

export const requireUser: RequestHandler = async (req, res, next) => {
  try {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) { res.status(401).json({ error: "Bearer token is required" }); return; }
    const payload = verifyAccessToken(header.slice(7));
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid subject");
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true } });
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    req.user = user;
    next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
};

export const requireRole = (...roles: string[]): RequestHandler => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ error: "Insufficient role" }); return; }
  next();
};
