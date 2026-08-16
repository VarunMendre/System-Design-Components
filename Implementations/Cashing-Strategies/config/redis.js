import { createClient } from "redis";

const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 10454,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

await redisClient.connect();
console.log("Redis connected successfully");

export default redisClient;
