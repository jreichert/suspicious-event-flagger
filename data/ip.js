import * as DB from "./db_client.js";

const NAMESPACE = "ips";

export const store = async (ip) => {
  await DB.addToSet(NAMESPACE, ip);
};

export const contains = async (ip) => {
  const found = await DB.isInSet(NAMESPACE, ip);
  return found;
};
