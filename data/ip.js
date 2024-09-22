import * as DB from "./db_client.js";

const NAMESPACE = "ips";

export const store = async (ip) => {
  await DB.insert(NAMESPACE, ip);
};

export const find = async (query) => {
  const result = await DB.find(NAMESPACE, query);
  return result;
};
