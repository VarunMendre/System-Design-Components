import redisClient from "../../config/redis.js";

const cacheTTL = 60;

export const getCache = async (key) => {
  const cachedData = await redisClient.get(key);

  if (!cachedData) return null;

  return JSON.parse(cachedData);
};

export const setCache = async (key, data) => {
  await redisClient.set(key, JSON.stringify(data), {
    EX: cacheTTL,
  });
};

export const invalidateTodosCache = async () => {
  const keysToDelete = [];

  for await (const key of redisClient.scanIterator({
    MATCH: "todos:*",
    COUNT: 100,
  })) {
    keysToDelete.push(key);
  }

  if (keysToDelete.length > 0) {
    await redisClient.del(keysToDelete);
  }

  console.log(`Invalidated ${keysToDelete.length} TODO cache key(s)`);
};
