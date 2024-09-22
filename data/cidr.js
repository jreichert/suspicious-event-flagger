import * as DB from "./db_client.js";

const NAMESPACE = "cidrs";

export const store = async (cidr) => {
  await DB.insert(NAMESPACE, cidr);
};

export const all = async () => {
  const result = await DB.all(NAMESPACE);
  return result;
};

export const find = async (query) => {
  const result = await DB.find(NAMESPACE, query);
  return result;
};
