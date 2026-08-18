const CACHE_TTL = 30;
import redisClient from "../../config/redis.js";

export const getCache = async (key) => {
  const cachedData = await redisClient.get(key);

  if (!cachedData) return null;

  return JSON.parse(cachedData);
};

export const setCache = async (key, data) => {
  await redisClient.set(key, JSON.stringify(data), {
    EX: CACHE_TTL,
  });

  console.log(`Cached stored with TTL: ${CACHE_TTL}`);
};

export const getCacheTTL = async (key) => {
  return await redisClient.ttl(key);
};
