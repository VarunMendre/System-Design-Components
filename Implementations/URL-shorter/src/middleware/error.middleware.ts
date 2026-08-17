// Error middleware placeholder.

import type { NextFunction, Request, Response } from "express";
import { ERROR_MESSAGES } from "../constants/errors.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  _res: Response,
  _next: NextFunction,
) => {
  const message =
    err instanceof Error ? err.message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  _res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message,
  });
};
