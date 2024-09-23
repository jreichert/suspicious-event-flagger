import * as DB from "./db_client.js";
import { v4 as uuidv4 } from "uuid";

const NAMESPACE = "events";
/**
 * DAO for managing events.  Event objects have the following structure:
 * {
 *   id: "asdf1235",
 *   user_id: "13445",
 *   ipv4: "192.244.137.0",
 *   type: "auth_failed",
 *   is_bad_cidr: true,
 *   is_bad_ipv4: false,
 *   is_bad_user: false,
 *   timestamp: 11241481358358
 * }

/**
 * Store one or more events that have been flagged as bad.
 * The same method is used for single or batch insertion.
 *
 * Note: if this were using a real DB then we would make use of that db's batch put capabilities
 * as appropriate.  However in the case of a tool like Redis, the best way to do this is
 * still to use single inserts (since Redis is single-threaded, there is no benefit to batching)
 *
 * @param { json } event A list of bad events to persist
 * @returns The number of events actually inserted
 */
export const store = async (events) => {
  // We are adding these to the sorted set by timestamp
  // since that is the most likely filter we would
  // add first.  To add multiple items to a ZSET in one shot,
  // args need to be sequenced as [score1, value1, score2,
  // value2,...]
  const scores = events.map((x) => x.timestamp);
  const args = scores.map((item, index) => [item, events[index]]);
  console.log(`ARGS: ${args}`);

  await DB.addToSortedSet(NAMESPACE, ...args);
};

/**
 * Return all events that were marked bad.  Curent implementation returns every
 * event that was ever marked bad; a full implementation would use the filter object
 * to filter by the following:
 *   * date range
 *   * within ip block
 *   * specific ip address
 *   * user
 *   * reason
 *
 *   @param {json} filter A filter object containing the criteria to use in filtering
 */
export const get = async (start = 0, end = Number.MAX_VALUE) => {
  const found = await DB.getFromSortedSet(NAMESPACE, start, end);
  return found;
};
