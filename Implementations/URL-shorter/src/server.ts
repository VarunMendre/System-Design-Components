// Process bootstrap will go here.
import { createApp } from "./app.js";
import { connectRedis } from "./config/redis.js";
import { env } from "./config/env.js";

const startServer = async () => {
  await connectRedis();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
  });
};

void startServer();

