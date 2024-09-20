import * as DB from "./db_client.js";

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
  const count = 0;

  for (const event in events) {
    const err = await DB.insert(event);

    if (err) {
      console.log(`Error inserting event: ${err}`);
    } else {
      count += 1;
    }
  }

  return count;
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
export const get = async (_filter) => {};
