import * as DB from "./db_client.js";

const NAMESPACE = "cidrs";

export const store = async (cidr) => {
  await DB.insert(NAMESPACE, cidr);
};
