import { redis } from "./redis.js";

/**
 * Add the given value or values to a Redis set.  The same method can be
 * used for either.
 *
 * @param { string } namespace The name of the set to store the value in
 * @param { string  } value The value to add to the set
 * @returns {int} the number of values added to the set
 */
export const addToSet = async (namespace, data) => {
  const result = await redis.sadd(namespace, data);
  return result;
};

/**
 * Add one or more items to a sorted set.
 *
 * @param {Array} The objects to store along with their associated scores.
 *   Format is [score1, obj1, score2, obj2, ...]
 */
export const addToSortedSet = async (namespace, ...args) => {
  await redis.zadd(namespace, ...args);
};

export const isInSet = async (namespace, value) => {
  const found = await redis.sismember(namespace, value);

  return found;
};

/**
 * Return all entries in an input set that exist in a Redis Set.
 * This is mainly a convenience method, as sismember() has complexity O(1)
 * And this has complexity O(n) (i.e. no real time savings)
 *
 * @param {string} namespace The Redis set to search
 * @param {Array<String>)} values The list of values to look for in the
 *   Redis set
 * @returns {Array<String>} The subset of values that are contained in NAMESPACE
 */
export const filterEntriesInSet = async (namespace, values) => {
  const found = await redis.smismember(namespace, values);

  return found;
};

/**
 * Return all entries from a Sorted Set in the given range.
 *
 * @param {string} namespace The name of the set
 * @param {integer} minScore The lowest score to retrieve
 * @param {integer} maxScore The highest score to retrieve
 * @returns {Array<Object>} The objects retrieved
 */
export const getFromSortedSet = async (
  namespace,
  minScore = 0,
  maxScore = Number.MAX_VALUE
) => {
  //version used just by cidr storage
  return await redis.zrangebyscore(namespace, minScore, maxScore);
};

/**
 * Return all entries from a Sorted Set in the given range.
 *
 * @param {string} namespace The name of the set
 * @param {integer} minScore The lowest score to retrieve
 * @param {integer} maxScore The highest score to retrieve
 * @returns {Array<Object>} The objects retrieved
 */
export const getJSONFromSortedSet = async (
  namespace,
  minScore = 0,
  maxScore = Number.MAX_VALUE
) => {
  //version used just by cidr storage
  const found = await redis.zrangebyscore(namespace, minScore, maxScore);
  console.log("FOUND");
  console.dir(found);
  const decoded = found.map(JSON.parse);
  return decoded;
};
