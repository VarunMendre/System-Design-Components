import express from "express";
import { getAllTodosWithCache } from "./controller.js";

const cacheRouter = express.Router();

cacheRouter.get("/todos", getAllTodosWithCache);

export default cacheRouter;
