import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
};

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser;
    accessToken?: string;
  }
}

const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);
const ISSUER = `${env.SUPABASE_URL}/auth/v1`;

function getBearerToken(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: env.SUPABASE_JWT_AUDIENCE,
    });

    req.accessToken = token;
    req.authUser = {
      id: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
      appMetadata:
        typeof payload.app_metadata === "object" &&
        payload.app_metadata !== null
          ? (payload.app_metadata as Record<string, unknown>)
          : undefined,
      userMetadata:
        typeof payload.user_metadata === "object" &&
        payload.user_metadata !== null
          ? (payload.user_metadata as Record<string, unknown>)
          : undefined,
    };
  } catch (_error) {
    req.authUser = undefined;
    req.accessToken = undefined;
  }

  next();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await optionalAuth(req, res, async () => {
    if (!req.authUser) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    next();
  });
}
