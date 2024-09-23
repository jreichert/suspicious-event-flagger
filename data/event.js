import * as DB from "./db_client.js";
import { v4 as uuidv4 } from "uuid";

const NAMESPACE = "events";
/**
 * DAO for managing events.  Event objects have the following structure:
 * {
 *   id: "some-uuid",
 *   user_id: "13445",
 *   ipv4: "192.244.137.0",
 *   type: "auth_failed",
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
  if (!events || events.length == 0) {
    console.log("nothing to do.");
    return;
  }

  // Need to add a unique id to each event in case of timestamp collisions
  for (const event of events) {
    event.id = uuidv4();
  }

  // We are adding these to the sorted set by timestamp
  // since that is the most likely filter we would
  // add first.  To add multiple items to a ZSET in one shot,
  // args need to be sequenced as [score1, value1, score2,
  // value2,...]
  const scores = events.map((x) => x.timestamp);
  const argsArray = scores.map((item, index) => [
    item,
    JSON.stringify(events[index]),
  ]);
  const args = argsArray.flat();

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
 * @param {integer} start Lowest IP to retrieve (integer representation)
 * @param {integer} end Highest IP to retrieve (integer representation)
 * @returns {Array<Event>} All events that were found
 */
export const getAll = async (start = 0, end = Number.MAX_VALUE) => {
  const found = await DB.getFromSortedSet(NAMESPACE, start, end);
  return found;
};
