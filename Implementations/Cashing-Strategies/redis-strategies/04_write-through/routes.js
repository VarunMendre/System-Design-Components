import express from "express";

import { getTodo, createTodo, updateTodo, deleteTodo } from "./controller.js";

const writeThroughRouter = express.Router();

writeThroughRouter.get("/todo/:id", getTodo);

writeThroughRouter.post("/todos", createTodo);

writeThroughRouter.patch("/todo/:id", updateTodo);

writeThroughRouter.delete("/todo/:id", deleteTodo);

export default writeThroughRouter;
