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
  console.log(`Adding to set ${namespace}`);
  console.dir({ msg: `Adding to set ${namespace}`, data });
  try {
    const result = await redis.sadd(namespace, data);
    return result;
  } catch (err) {
    console.log("Data error:");
    console.dir(err.stack);
  }
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
  try {
    const found = await redis.zrangebyscore(namespace, minScore, maxScore);
    const decoded = found.map(JSON.parse);
    return decoded;
  } catch (err) {
    console.log(`Error retrieving JSON from set ${namespace}`);
    console.dir(err.stack);
    return null;
  }
};

/**
 * Remove one or more values from a Set.
 *
 * @param namespace The name of the Set
 * @param values A single value or an array of values
 */
export const removeFromSet = async (namespace, values) => {
  try {
    await redis.zrem(namespace, values);
  } catch (err) {
    console.log(`Error removing values from set ${namespace}`);
    console.dir(err.stack);
  }
};
