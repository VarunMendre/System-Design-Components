import express from "express";
import { connectDB } from "./config/db.js";
import router from "./routes.js";
import cacheAsideRouter from "./redis-strategies/01_cache-aside/routes.js";
import invalidationRouter from "./redis-strategies/02_cache-invalidation/routes.js";
import ttlCacheRouter from "./redis-strategies/03_ttl-cache/routes.js";
import writeThroughRouter from "./redis-strategies/04_write-through/routes.js";
import writeBehindRouter from "./redis-strategies/05_write-behind/routes.js";
import cacheStampedeRouter from "./redis-strategies/06_cache-stampede/routes.js";

const PORT = 4000;
const app = express();

app.use(express.json());

await connectDB();

app.use("/api", router);

// Strategy #1
app.use("/api/cache-aside", cacheAsideRouter);

// Strategy #2
app.use("/api/cache-invalidation", invalidationRouter);

// Strategy #3
app.use("/api/ttl-cache", ttlCacheRouter);

// Strategy #4
app.use("/api/write-through", writeThroughRouter);

// Strategy #5
app.use("/api/write-behind", writeBehindRouter);

// Redis Strategy #6
app.use("/api/cache-stampede", cacheStampedeRouter);

app.listen(PORT, () => {
  console.log("Server Started on port:", PORT);
});
