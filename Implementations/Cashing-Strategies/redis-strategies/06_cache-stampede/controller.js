import Task from "../../schema.js";
import {
  acquireLock,
  getCache,
  releaseLock,
  setCache,
  waitForCache,
} from "./cache.js";

export const getTodosWithStampedeProtection = async (req, res) => {
  const queryString = new URLSearchParams(req.query).toString();

  const cacheKey = `stampede-todos:${queryString || "all"}`;

  try {
    console.log(`Cache Key: ${cacheKey}`);

    // STEP 1 — Normal cache lookup

    const cachedTodos = await getCache(cacheKey);

    if (cachedTodos) {
      console.log("Cache Hit");

      return res.status(200).json({
        success: true,
        source: "redis",
        cache: "hit",
        count: cachedTodos.length,
        data: cachedTodos,
      });
    }

    console.log("Cache Miss");

    // STEP 2 — Try to acquire the lock
    const lock = await acquireLock(cacheKey);

    // CASE A — We acquired the lock

    if (lock) {
      try {
        /*
        Another request could have populated the cache
        just before we acquired the lock.
        */

        const cachedAfterLock = await getCache(cacheKey);

        if (cachedAfterLock) {
          console.log("Cache populated before database query");

          return res.status(200).json({
            success: true,
            source: "redis",
            cache: "hit-after-lock",
            count: cachedAfterLock.length,
            data: cachedAfterLock,
          });
        }

        // STEP 3 — We are the winner

        console.log("Lock acquired. Fetching data from MongoDB");

        const queryObj = { ...req.query };

        const excludedFields = ["page", "limit", "sort", "q"];

        excludedFields.forEach((field) => {
          delete queryObj[field];
        });

        if (queryObj.isCompleted) {
          queryObj.isCompleted = queryObj.isCompleted === "true";
        }

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        // STEP 4 — Query MongoDB

        const todos = await Task.find(queryObj).skip(skip).limit(limit);

        // STEP 5 — Populate Redis

        await setCache(cacheKey, todos);

        console.log("Database result stored in Redis");

        // STEP 6 — Return result
        return res.status(200).json({
          success: true,
          source: "mongodb",
          cache: "miss",
          count: todos.length,
          page,
          limit,
          data: todos,
        });
      } finally {
        //  Release the lock only if this request owns it.
        await releaseLock(lock.lockKey, lock.lockToken);
      }
    }

    // CASE B — Another request owns the lock

    console.log("Another request is fetching the data. Waiting...");

    /*
     * waitForCache() will:
     *
     * 1. Check Redis.
     * 2. Check whether the lock still exists.
     * 3. Wait briefly if the lock still exists.
     * 4. Immediately return null if the lock disappears.
     *
     * If the original winner crashes, its lock expires
     * after LOCK_TTL seconds and this function returns null.
     */

    const cachedAfterWaiting = await waitForCache(cacheKey);

    // CASE B1 — Another request populated the cache

    if (cachedAfterWaiting) {
      console.log("Cache populated by another request");

      return res.status(200).json({
        success: true,
        source: "redis",
        cache: "hit-after-wait",
        count: cachedAfterWaiting.length,
        data: cachedAfterWaiting,
      });
    }

    // CASE B2 — Lock disappeared

    /*
     * This means the previous winner released the lock
     * without populating the cache OR its TTL expired.
     *
     * We now try to become the new winner.
     */

    console.log("Lock disappeared. Retrying lock acquisition...");

    const retryLock = await acquireLock(cacheKey);

    // CASE B2.1 — We became the new winner

    if (retryLock) {
      try {
        // check in redis first

        const cachedAfterRetry = await getCache(cacheKey);

        if (cachedAfterRetry) {
          return res.status(200).json({
            success: true,
            source: "redis",
            cache: "hit-after-retry",
            count: cachedAfterRetry.length,
            data: cachedAfterRetry,
          });
        }

        console.log("New lock owner fetching data from MongoDB...");

        const queryObj = { ...req.query };

        const excludedFields = ["page", "limit", "sort", "q"];

        excludedFields.forEach((field) => {
          delete queryObj[field];
        });

        if (queryObj.isCompleted) {
          queryObj.isCompleted = queryObj.isCompleted === "true";
        }

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 5;

        const skip = (page - 1) * limit;

        const todos = await Task.find(queryObj).skip(skip).limit(limit);

        await setCache(cacheKey, todos);

        console.log("New winner populated Redis");

        return res.status(200).json({
          success: true,
          source: "mongodb",
          cache: "miss-after-lock-expiration",
          count: todos.length,
          page,
          limit,
          data: todos,
        });
      } finally {
        await releaseLock(retryLock.lockKey, retryLock.lockToken);
      }
    }

    // CASE B2.2 — Someone else won the retry

    /*
     * Another request acquired the lock before us.
     * Wait one more time for the cache.
     */

    const finalCachedData = await waitForCache(cacheKey);

    if (!finalCachedData) {
      return res.status(503).json({
        success: false,
        message: "Unable to populate cache at this time",
      });
    }

    return res.status(200).json({
      success: true,
      source: "redis",
      cache: "hit-after-retry",
      count: finalCachedData.length,
      data: finalCachedData,
    });
  } catch (err) {
    console.error("Cache Stampede Error:", err);

    return res.status(503).json({
      success: false,
      message: err.message,
    });
  }
};
