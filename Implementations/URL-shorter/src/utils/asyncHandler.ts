// Async handler helper placeholder.
import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export const asynHandler = (fn: AsyncRouteHandler): RequestHandler => {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
};
