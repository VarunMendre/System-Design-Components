import crypto from "crypto";
import Task from "../../schema.js";
import { getCache, getCacheTTL, setCache } from "./cache.js";

export const getTodosWithTTL = async (req, res, next) => {
  const queryParams = new URLSearchParams(req.query).toString();
  const uniqueString = crypto
    .createHash("sha256")
    .update(queryParams)
    .digest("base64");

  const cacheKey = `todos:${uniqueString || "all"}`;
  console.log("Cache Key:", cacheKey);

  const cachedTodos = await getCache(cacheKey);

  if (cachedTodos) {
    const remainingTTL = await getCacheTTL(cacheKey);

    console.log("Cache Hit");
    console.log(`Remaining TTL: ${remainingTTL}'s`);

    return res.status(200).json({
      success: true,
      source: "redis",
      cache: {
        hit: true,
        ttl: remainingTTL,
      },
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

  try {
    let query = Task.find(queryObj);

    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 5;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const todos = await query;
    await setCache(cacheKey, todos);
    const remainingTTL = await getCacheTTL(cacheKey);

    console.log(`Cache created with TTL: ${remainingTTL}`);
    res.status(200).json({
      success: true,
      source: "mongodb",
      cache: {
        hit: false,
        ttl: remainingTTL,
      },
      count: todos.length,
      page,
      limit,
      data: todos,
    });
  } catch (err) {
    console.error("TTL Cache Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};
