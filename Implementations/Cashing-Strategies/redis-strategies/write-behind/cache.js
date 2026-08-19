import redisClient from "../../config/redis.js";

const CACHE_TTL = 300; // 5 min
const QUEUE_KEY = "write-behind:queue";

// GET TODO FROM CACHE
export const getTodoCache = async (todoId) => {
  const key = `todo:${todoId}`;

  const cachedTodo = await redisClient.get(key);

  if (!cachedTodo) return null;

  return JSON.parse(cachedTodo);
};

// SET TODO IN CACHE
export const setTodoCache = async (todo) => {
  const key = `todo:${todo._id}`;

  await redisClient.set(key, JSON.stringify(todo), {
    EX: CACHE_TTL,
  });

  console.log(`Cached TODO: ${key}`);
};

// DELETE TODO FROM CACHE
export const deleteTodoCache = async (todoId) => {
  const key = `todo:${todoId}`;

  await redisClient.del(key);

  console.log(`Deleted TODO cache: ${key}`);
};

// ADD OPERATION TO WRITE-BEHIND QUEUE
export const addToWriteQueue = async (operation) => {
  await redisClient.rPush(QUEUE_KEY, JSON.stringify(operation));

  console.log("Operation added to write-behind queue");
};
