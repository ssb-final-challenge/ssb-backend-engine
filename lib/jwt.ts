import jwt from "jsonwebtoken";

const secret: string = process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET is required"); })();

export interface AuthTokenPayload { sub: string; role: string; }
export function createAccessToken(user: { id: number; role: string }): string {
  return jwt.sign({ sub: String(user.id), role: user.role }, secret, { expiresIn: "7d", issuer: "ssb-backend" });
}
export function verifyAccessToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, secret, { issuer: "ssb-backend" });
  if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.role !== "string") throw new Error("Invalid token payload");
  return { sub: payload.sub, role: payload.role };
}
