import {
  addToWriteQueue,
  deleteTodoCache,
  getTodoCache,
  setTodoCache,
} from "./cache.js";
import mongoose from "mongoose";

export const getTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  try {
    const cachedTodo = await getTodoCache(id);

    if (!cachedTodo) {
      return res.status(404).json({
        success: false,
        message:
          "Todo not available in cache. Write-behind strategy expects the cache to contain the data.",
      });
    }

    console.log("Cache Hit");

    return res.status(200).json({
      success: true,
      source: "redis",
      data: cachedTodo,
    });
  } catch (err) {
    console.error("Get Todo Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const createTodo = async (req, res) => {
  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res.status(422).json({
      message: "title & description fields are required",
    });
  }

  try {
    const todo = {
      _id: new mongoose.Types.ObjectId(),
      title,
      description,
      isCompleted: isCompleted ?? false,
      priority: priority ?? "low",
      dueDate: dueDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Write to Redis
    await setTodoCache(todo);

    // 2. Queue MongoDB operation

    await addToWriteQueue({
      operation: "CREATE",
      todo,
    });

    return res.status(201).json({
      success: true,
      message: "Todo cached and queued for database persistence",
      source: "redis",
      data: todo,
    });
  } catch (err) {
    console.error("Create Todo Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: err.message,
    });
  }
};

export const updateTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res.status(422).json({
      message: "title & description fields are required",
    });
  }

  try {
    const existingTodo = await getTodoCache(id);

    if (!existingTodo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found in cache",
      });
    }

    const updatedTodo = {
      ...existingTodo,
      title,
      description,
      isCompleted,
      priority,
      dueDate,
      updatedAt: new Date(),
    };

    // 1. Update Redis immediately
    await setTodoCache(updatedTodo);

    // 2. Queue MongoDB update
    await addToWriteQueue({
      operation: "UPDATE",
      todo: updatedTodo,
    });

    return res.status(200).json({
      success: true,
      message: "Todo updated in cache and queued for database persistence",
      source: "redis",
      data: updatedTodo,
    });
  } catch (err) {
    console.error("Update Todo Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: err.message,
    });
  }
};

export const deleteTodo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Todo ID is required",
    });
  }

  try {
    // 1. Delete from Redis immediately
    await deleteTodoCache(id);

    // 2. Queue MongoDB deletion
    await addToWriteQueue({
      operation: "DELETE",
      todoId: id,
    });

    return res.status(200).json({
      success: true,
      message: "Todo removed from cache and queued for database deletion",
    });
  } catch (err) {
    console.error("Delete Todo Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: err.message,
    });
  }
};
