// Application wiring will go here.

import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { logger } from "./utils/logger.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));

  app.use("/health", healthRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  app.use(errorMiddleware);

  return app;
};
