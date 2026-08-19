import redisClient from "../../config/redis.js";

const CACHE_TTL = 60;

export const getTodoCache = async (todoId) => {
  const key = `todo:${todoId}`;

  const cachedTodo = await redisClient.get(key);

  if (!cachedTodo) return null;

  return JSON.parse(cachedTodo);
};

export const setTodoCache = async (todo) => {
  const key = `todo:${todo._id}`;

  await redisClient.set(key, JSON.stringify(todo), {
    EX: CACHE_TTL,
  });

  console.log(`Todo cached: ${key}`);
};

export const deleteTodoCache = async (todoId) => {
  const key = `todo:${todoId}`;

  await redisClient.del(key);

  console.log(`Todo cache deleted: ${key}`);
};

