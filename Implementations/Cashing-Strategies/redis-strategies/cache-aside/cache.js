import redisClient from "../../config/redis.js";

const cacheTTL = 50;

export const getCache = async (key) => {
  const cachedData = await redisClient.get(key);

  if (!cachedData) {
    return null;
  }

  try {
    return JSON.parse(cachedData);
  } catch {
    return cachedData;
  }
};

export const setCache = async (key, data) => {
  await redisClient.set(key, JSON.stringify(data), {
    EX: cacheTTL,
  });
};
