import { randomUUID } from "crypto";
import redisClient from "../../config/redis.js";

const CACHE_TTL = 60;
const LOCK_TTL = 5;
const RETRY_DELAY = 100;
const MAX_WAIT_TIME = 10_000;
const LOCK_PREFIX = "lock:";

export const getCache = async (key) => {
  const cachedData = await redisClient.get(key);

  if (!cachedData) return null;
  return JSON.parse(cachedData);
};

export const setCache = async (key, data) => {
  await redisClient.set(key, JSON.stringify(data), {
    EX: CACHE_TTL,
  });
};

// ACQUIRE DISTRIBUTED LOCK

export const acquireLock = async (cacheKey) => {
  const lockKey = `${LOCK_PREFIX}${cacheKey}`;

  // This value identifies the owner of the lock.
  const lockToken = randomUUID();

  /*
   * SET lockKey lockToken NX EX 5
   *
   * NX:
   * Only create the key if it doesn't already exist.
   *
   * EX:
   * Automatically expire the lock after 5 seconds.
   */

  const result = await redisClient.set(lockKey, lockToken, {
    NX: true,
    EX: LOCK_TTL,
  });

  if (result !== "OK") {
    return null;
  }

  console.log(`Lock acquired: ${lockKey}`);

  return {
    lockKey,
    lockToken,
  };
};

// RELEASE DISTRIBUTED LOCK

export const releaseLock = async (lockKey, lockToken) => {
  /*
   * IMPORTANT:
   *
   * We cannot simply do:
   *
   * redisClient.del(lockKey)
   *
   * because the lock may have expired and another request
   * may have acquired a NEW lock using the same key.
   *
   * We therefore atomically:
   *
   * 1. Read the lock value.
   * 2. Compare it with our token.
   * 3. Delete only if it matches.
   */

  const releaseLockScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `;

  const result = await redisClient.eval(releaseLockScript, {
    keys: [lockKey],
    arguments: [lockToken],
  });

  if (result === 1) console.log(`Lock released: ${lockKey}`);
  else
    console.log(
      `Lock was already expired or belongs to another request: ${lockKey}`,
    );
};

// WAIT FOR CACHE

export const waitForCache = async (cacheKey) => {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    // check cache first, The winner may've finished while we waiting

    const cachedData = await getCache(cacheKey);

    if (cachedData) return cachedData;

    // Cache doesn't exist & check the current lock still exits

    const lockKey = `${LOCK_PREFIX}${cacheKey}`;
    const lockExists = await redisClient.exists(lockKey);

    /*
     * This is important.
     *
     * If the lock disappeared, the previous winner either:
     *
     * - released it
     * - crashed
     * - exceeded its TTL
     *
     * The caller should immediately stop waiting and
     * compete for the new lock.
     */

    if (!lockExists) return null;

    await new Promise((resolve) => {
      setTimeout(resolve, RETRY_DELAY);
    });
  }

  // We don't wait forever.

  throw new Error("Timed out while waiting for cache to be populated");
};
