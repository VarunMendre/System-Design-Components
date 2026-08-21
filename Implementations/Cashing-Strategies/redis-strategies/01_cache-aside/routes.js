import express from "express";
import { getAllTodosWithCache } from "./controller.js";

const router = express.Router();

router.get("/todos", getAllTodosWithCache);

export default router;
