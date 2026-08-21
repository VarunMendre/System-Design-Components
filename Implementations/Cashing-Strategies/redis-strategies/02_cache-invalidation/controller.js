import crypto from "crypto";
import Task from "../../schema.js";
import { invalidateTodosCache, getCache, setCache } from "./cache.js";

export const createInvalidationTodo = async (req, res, next) => {
  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res
      .status(422)
      .json({ message: "title & description fields are required" });
  }

  try {
    await Task.insertOne({
      title,
      description,
      isCompleted,
      priority,
      dueDate,
    });

    await invalidateTodosCache();
    res.status(201).json({ message: "record created successfully" });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: "Failed to create task",
      error: err.message,
    });
  }
};

export const getInvalidationTodos = async (req, res, next) => {
  try {
    const queryParams = new URLSearchParams(req.query).toString();
    const uniqueString = crypto
      .createHash("sha256")
      .update(queryParams)
      .digest("base64");

    const cacheKey = `todos:${uniqueString || "all"}`;
    console.log("Cache Key:", cacheKey);

    const cachedTodos = await getCache(cacheKey);

    if (cachedTodos) {
      console.log("Cache Hit");

      return res.status(200).json({
        success: true,
        source: "redis",
        count: cachedTodos.length,
        data: cachedTodos,
      });
    }

    console.log("Cache Miss");

    const queryObj = { ...req.query };

    const excludedFields = ["page", "limit", "sort", "q"];
    excludedFields.forEach((item) => delete queryObj[item]);

    if (queryObj.isCompleted) {
      queryObj.isCompleted = queryObj.isCompleted === "true";
    }

    let query = Task.find(queryObj);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const todos = await query;

    await setCache(cacheKey, todos);
    console.log("Data stored in Redis");

    res.status(200).json({
      success: true,
      source: "mongodb",
      count: todos.length,
      page,
      limit,
      data: todos,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const getSingleTodo = async (req, res, next) => {
  const queryParams = new URLSearchParams(req.query).toString();
  const uniqueString = crypto
    .createHash("sha256")
    .update(queryParams)
    .digest("base64");

  const cacheKey = `todos:${uniqueString || "all"}`;
  console.log("Cache Key:", cacheKey);

  const cachedTodos = await getCache(cacheKey);

  if (cachedTodos) {
    console.log("Cache Hit");

    return res.status(200).json({
      success: true,
      source: "redis",
      count: cachedTodos.length,
      data: cachedTodos,
    });
  }

  console.log("Cache Miss");

  const todoId = req.params?.id;

  if (!todoId) {
    return res.status(400).json({ message: "request params is missing" });
  }

  try {
    const data = await Task.findOne({ _id: todoId });
    await setCache(cacheKey, data);
    return res
      .status(200)
      .json({ success: true, source: "mongoDB", details: data });
  } catch (err) {
    return res.status(404).json({ success: false, message: err });
  }
};

export const updateInvalidationTodo = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "request params is missing" });
  }

  const { title, description, isCompleted, priority, dueDate } = req.body;

  if (!title || !description) {
    return res
      .status(422)
      .json({ message: "title & description fields are required" });
  }

  try {
    const todo = await Task.findOneAndUpdate(
      { _id: id },
      { title, description, isCompleted, priority, dueDate },
      { upsert: true, new: true, runValidators: true },
    );

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    await invalidateTodosCache();
    return res.status(200).json({ updated: true, data: todo });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};

export const deleteInvalidationTodo = async (req, res, next) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json({ message: "request parameter is missing " });

  try {
    const deletedTodo = await Task.findOneAndDelete({ _id: id });

    if (!deletedTodo) {
      return res.status(404).json({ message: "Task not found" });
    }

    await invalidateTodosCache();
    return res
      .status(200)
      .json({ message: "Task deleted successfully", data: deletedTodo });
  } catch (err) {
    return res.status(400).json({ message: err });
  }
};
