import * as DB from "./db_client.js";
import ip from "ip";
import cidrMatcher from "cidr-matcher";
import * as CidrUtils from "../util/cidr_utils.js";

const NAMESPACE = "cidrs";

/**
 * Add a cidr block to a Sorted Set in Redis.  This is an efficient storage
 * mechanism for determining if an ip belongs to any of our known suspicious CIDR
 * blocks because we only check the subnets that start before the target ip.
 *
 * This operation is idempotent, i.e. calling this twice with the same CIDR block
 * will only add it once
 *
 * @param {string} The cidr block in standard CIDR notation (x.x.x.x/y)
 */
export const store = async (cidr) => {
  if (!CidrUtils.isValidCidr(cidr)) {
    throw Error(`${cidr} is not a valid CIDR block`);
  }
  const sortKey = CidrUtils.lowestIpFor(cidr);

  console.dir(DB);
  await DB.addToSortedSet(NAMESPACE, sortKey, cidr);
};

/**
 * Retrieve all of the CIDR blocks added to the configuration.
 *
 * @returns {Array<Object>} An array of all CIDR blocks in the configuration
 */
export const getAll = async () => {
  const all = await DB.getFromSortedSet(NAMESPACE);
  return all;
};

/**
 * Delete a CIDR block from the configuration.
 * If the CIDR block isn't already present then this is a no-op.
 *
 * @param {String} cidr The cidr block to delete
 */
export const del = async (cidr) => {
  await DB.removeFromSet(NAMESPACE, cidr);
};

/**
 * Determine if the suspicious CIDR list contains a given IP address.
 *
 * @param {string} ip The IP address to check
 * @returns {string} The first matched CIDR block, or false if
 *   no matches are found
 */
export const containsIp = async (ipv4) => {
  const integerIp = ip.toLong(ipv4);
  const candidates = await DB.getFromSortedSet(NAMESPACE, 0, integerIp);

  for (const candidate of candidates) {
    const matcher = new cidrMatcher([candidate]);
    if (matcher.contains(ipv4)) {
      console.log(`CIDR match found for ip ${ipv4}: ${candidate}`);
      return candidate;
    }
  }

  return null;
};
