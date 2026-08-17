import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { redisClient } from "../config/redis.js";
import { ERROR_MESSAGES } from "../constants/errors.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";

declare global {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}

type AuthTokenPayload = jwt.JwtPayload & {
  sub?: string;
  email?: string;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    const userId = payload.sub;
    const email = payload.email;

    if (!userId || !email) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    const sessionKey = `session:${userId}:${token}`;
    const session = await redisClient.get(sessionKey);

    if (!session) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }

    req.user = { id: userId, email };
    return next();
  } catch {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
  }
};
