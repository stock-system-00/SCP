
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { createHash } from "crypto";


const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("A variável de ambiente SESSION_SECRET não está definida.");
}
const encodedKey = new TextEncoder().encode(secretKey);
const COOKIE_NAME = "session_token";

export type SessionPayload = {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  avatarUrl?: string | null;
  ownerId: string;
  lojaId?: string | null;
  activeLojaId?: string | null;
  expiresAt: Date;
};

export async function createSession(user: {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  avatarUrl?: string | null;
  ownerId: string;
  lojaId?: string | null;
  activeLojaId?: string | null;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await new SignJWT({ ...user, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {


  if (hash.length === 64 && !hash.startsWith("$2a$")) {

     const crypto = await import("crypto");
     const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
     return legacyHash === hash;
  }
  return bcrypt.compare(password, hash);
}
