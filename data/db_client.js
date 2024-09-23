import { redis } from "./redis.js";

/**
 * @param { string } namespace The name of the set to store the value in
 * @param { string  } value The value to add to the set
 */
export const addToSet = async (namespace, value) => {
  await redis.sadd(namespace, value);
};

export const addToSortedSet = async (namespace, score, value) => {
  await redis.zadd(namespace, score, value);
};

export const isInSet = async (namespace, value) => {
  const found = await redis.sismember(namespace, value);

  return found;
};

export const getFromSortedSet = async (namespace, maxScore) => {
  const found = await redis.zrangebyscore(namespace, 0, maxScore);
  return found;
};
