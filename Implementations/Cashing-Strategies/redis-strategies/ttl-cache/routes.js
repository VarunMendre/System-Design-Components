import express from "express";
import { getTodosWithTTL } from "./controller.js";

const ttlCacheRouter = express.Router();

// /api/ttl-cache/todos
ttlCacheRouter.get("/todos", getTodosWithTTL);

export default ttlCacheRouter;
