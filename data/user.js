import * as DB from "./db_client.js";

const NAMESPACE = "users";

export const store = async (user) => {
  await DB.insert(NAMESPACE, user);
};

export const find = async (query) => {
  const result = await DB.find(NAMESPACE, query);
  return result;
};
