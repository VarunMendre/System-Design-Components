import { createClient } from "redis";
import { env } from "./env.js";

export const redisClient = createClient({
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    keepAlive: true,
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis reconnection failed after 10 attempts");
        return new Error("Redis reconnection failed");
      }

      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("connect", () => console.log("Redis client connecting..."));
redisClient.on("ready", () => console.log("Redis client ready"));
redisClient.on("reconnecting", () =>
  console.log("Redis client is reconnecting..."),
);
redisClient.on("error", (err) => {
  if (err.message.includes("Connection timeout")) {
    console.warn("Redis connection timeout... retrying");
  } else {
    console.error("Redis client error:", err);
  }
});

let connectingPromise: Promise<void> | null = null;

export const connectRedis = async () => {
  if (redisClient.isOpen) return;
  if (connectingPromise) return connectingPromise;

  if (!env.REDIS_HOST) {
    console.warn("REDIS_HOST is missing. Redis features will be disables.");

    return;
  }

  connectingPromise = (async () => {
    try {
      await redisClient.connect();
      console.log("Redis connected");
    } catch (err) {
      console.error("Redis connection failed:", err);
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};
