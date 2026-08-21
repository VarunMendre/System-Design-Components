import express from "express";

import { getTodosWithStampedeProtection } from "./controller.js";

const router = express.Router();

router.get("/todos", getTodosWithStampedeProtection);

export default router;
