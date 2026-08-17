import express from "express";
import {
  createInvalidationTodo,
  deleteInvalidationTodo,
  getInvalidationTodos,
  updateInvalidationTodo,
} from "./controller.js";


const invalidationRouter = express.Router();

invalidationRouter.get("/todos", getInvalidationTodos);
invalidationRouter.post("/todos", createInvalidationTodo);
invalidationRouter.patch("/todos/:id", updateInvalidationTodo);
invalidationRouter.delete("/todos/:id", deleteInvalidationTodo);

export default invalidationRouter;
