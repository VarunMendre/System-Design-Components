import express from "express";
import { connectDB } from "./config/db.js";
import router from "./routes.js";
import cacheRouter from "./redis-strategies/cache-aside/routes.js";
import invalidationRouter from "./redis-strategies/cache-invalidation/routes.js";
import ttlCacheRouter from "./redis-strategies/ttl-cache/routes.js";

const PORT = 4000;
const app = express();

app.use(express.json());

await connectDB();

app.use("/api", router);

// Strategy #1
app.use("/api/cache-aside", cacheRouter);

// Strategy #2
app.use("/api/cache-invalidation", invalidationRouter);

// Strategy #3
app.use("/api/ttl-cache", ttlCacheRouter);

app.listen(PORT, () => {
  console.log("Server Started on port:", PORT);
});
