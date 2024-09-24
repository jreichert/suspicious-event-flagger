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
  console.log(`cidr/store: ${cidr}`);
  const cidrParts = cidr.split("/");
  const sortKey = ip.toLong(cidrParts[0]);

  await DB.addToSortedSet(NAMESPACE, sortKey, cidr);
};

export const getAll = async () => {
  const all = await DB.getFromSortedSet(NAMESPACE);
  return all;
};

export const del = async (cidr) => {
  await DB.removeFromSet(NAMESPACE, cidr);
};

/**
 * Determine if the bad CIDR list contains a given IP address.
 *
 * @param {string} ip The IP address to check
 * @returns {string} The first matched CIDR block, or false if
 *   no matches are found
 */
export const containsIp = async (ipv4) => {
  const integerIp = ip.toLong(ipv4);
  const candidates = await DB.getFromSortedSet(NAMESPACE, 0, integerIp);
  if (ipv4 == "171.79.178.249") {
    console.log(`candidates for ${ipv4} (${integerIp}):`);
    console.dir(candidates);
  }

  for (const candidate of candidates) {
    const matcher = new cidrMatcher([candidate]);
    if (matcher.contains(ipv4)) {
      console.log(`CIDR match found for ip ${ipv4}: ${candidate}`);
      return candidate;
    }
  }

  return null;
};
