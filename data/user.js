import * as DB from "./db_client.js";

const NAMESPACE = "users";

export const store = async (username) => {
  await DB.addToSet(NAMESPACE, username);
};

export const contains = async (username) => {
  const found = await DB.isInSet(NAMESPACE, username);
  return found;
};
