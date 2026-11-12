import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma.js";
import { createAccessToken } from "../lib/jwt.js";
import { createRemoteJWKSet, jwtVerify } from "jose";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function verifyAppleIdentityToken(identityToken: string, nonce?: string) {
  const audience = (process.env.APPLE_BUNDLE_IDS ?? process.env.APPLE_BUNDLE_ID ?? "")
    .split(",")
    .map((bundleId) => bundleId.trim())
    .filter(Boolean);
  if (audience.length === 0) throw new Error("APPLE_BUNDLE_IDS is required");
  const { payload } = await jwtVerify(identityToken, appleKeys, { issuer: "https://appleid.apple.com", audience });
  if (!payload.sub) throw new Error("Apple subject is missing");
  if (nonce && payload.nonce !== nonce) throw new Error("Invalid Apple nonce");
  return { appleUserId: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined, emailVerified: payload.email_verified === true };
}

export async function signInWithApple(input: { identityToken: string; appleUserId: string; nonce?: string; name?: string; email?: string; role?: string }) {
  const apple = await verifyAppleIdentityToken(input.identityToken, input.nonce);
  if (apple.appleUserId !== input.appleUserId) throw new Error("Apple user ID mismatch");
  const email = apple.email ?? input.email;
  let user = await prisma.user.findUnique({ where: { appleUserId: apple.appleUserId } });
  if (!user && email) user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    if (!email) throw new Error("Apple email is required for first sign-in");
    user = await prisma.user.create({ data: { appleUserId: apple.appleUserId, name: input.name?.trim() || "Apple User", email: email.toLowerCase(), passwordHash: null, role: input.role ?? "buyer" } });
  } else if (!user.appleUserId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { appleUserId: apple.appleUserId, ...(input.name ? { name: input.name.trim() } : {}) } });
  }
  const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
  return { user: publicUser, accessToken: createAccessToken(user) };
}

export async function registerUser(input: { name: string; email: string; password: string; role: string }) {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email || input.password.length < 8) throw new Error("Invalid registration data");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email is already registered");
  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  return { user, accessToken: createAccessToken(user) };
}

export async function loginUser(emailInput: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new Error("Invalid email or password");
  const publicUser = { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
  return { user: publicUser, accessToken: createAccessToken(user) };
}
