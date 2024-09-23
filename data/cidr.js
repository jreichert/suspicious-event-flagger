import * as DB from "./db_client.js";
import ip from "ip";
import cidrMatcher from "cidr-matcher";

const NAMESPACE = "cidrs";

/**
 * Add a cidr block to a Sorted Set in Redis.  This is an efficient storage
 * mechanism for determining if an ip belongs to any of our known bad CIDR
 * blocks because we only check the subnets that start before the target ip.
 *
 * @param {string} The cidr block in standard CIDR notation (x.x.x.x/y)
 */
export const store = async (cidr) => {
  const cidrParts = cidr.split("/");
  const sortKey = ip.toLong(cidrParts[0]);

  await DB.addToSortedSet(NAMESPACE, sortKey, cidr);
};

/**
 * Determine if the bad CIDR list contains a given IP address.
 *
 * @param {string} ip The IP address to check
 * @returns {string} The first matched CIDR block, or false if
 *   no matches are found
 */
export const containsIp = async (ip) => {
  const integerIp = ip.toLong(ip);
  const candidates = await DB.getFromSortedSet(NAMESPACE, 0, integerIp);

  for (const candidate of candidates) {
    const matcher = new cidrMatcher([candidate]);
    if (matcher.contains(ip)) {
      return candidate;
    }
  }

  return null;
};
