import express from "express";
import { createTodos, deleteSingleTodo, getAllTodos, getSingleTodo, updateSingleTodo } from "./controller.js";

const router = express.Router();

router.post("/todos", createTodos);
router.get("/todos", getAllTodos);
router.get("/todo/:id", getSingleTodo);
router.patch("/todo/:id", updateSingleTodo);
router.delete("/todo/:id", deleteSingleTodo);

export default router;
