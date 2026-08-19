import express from "express";

import { getTodo, createTodo, updateTodo, deleteTodo } from "./controller.js";

const router = express.Router();

router.get("/todo/:id", getTodo);

router.post("/todos", createTodo);

router.patch("/todo/:id", updateTodo);

router.delete("/todo/:id", deleteTodo);

export default router;
