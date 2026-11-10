import PrismaClient from "@prisma/client";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma.js";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function registerUser(input: { name: string; email: string; password: string; role: string }) {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email || input.password.length < 8) throw new Error("Invalid registration data");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email is already registered");
  return prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: input.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
}

export async function loginUser(emailInput: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new Error("Invalid email or password");
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}
