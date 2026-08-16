import crypto from "crypto";
import { getCache, setCache } from "./cache.js";
import Task from "../../schema.js";

export const getAllTodosWithCache = async (req, res) => {
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

    excludedFields.forEach((field) => {
      delete queryObj[field];
    });

    if (queryObj.isCompleted) {
      queryObj.isCompleted = queryObj.isCompleted === "true";
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const todos = await Task.find(queryObj).skip(skip).limit(limit);

    await setCache(cacheKey, todos);
    console.log("Data stored in Redis");

    return res.status(200).json({
      success: true,
      source: "mongoDB",
      count: todos.length,
      page,
      limit,
      data: todos,
    });
  } catch (err) {
    console.error("Cache Aside Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
