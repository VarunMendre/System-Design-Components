// Health routes placeholder.

import { Router } from "express";
import { HTTP_STATUS } from "../../constants/httpStatus.js";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "OK",
  });
});

export { healthRouter };
