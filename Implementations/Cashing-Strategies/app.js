import express from "express";
import { connectDB } from "./config/db.js";
import router from "./routes.js";
import cacheRouter from "./redis-strategies/cache-aside/routes.js";
import invalidationRouter from "./redis-strategies/cache-invalidation/routes.js";

const PORT = 4000;
const app = express();

app.use(express.json());

await connectDB();

app.use("/api", router);
app.use("/api/cache-aside", cacheRouter);
app.use("/api/cache-invalidation", invalidationRouter);

app.listen(PORT, () => {
  console.log("Server Started on port:", PORT);
});
