import { sqlite } from "./sqlite.js";

export const insert = async (namespace, record) => {
  const cols = [];
  const values = [];

  for (const key in record) {
    cols.push(key);
    values.push(record[key]);
  }

  const sql = `INSERT OR IGNORE INTO  ${namespace} (${cols.join(
    ","
  )}) VALUES (${Array(values.length).fill("?")})`;

  console.log(`SQL is: ${sql}`);

  const db = await sqlite();

  const result = await db.run(sql, values, (err) => {
    if (err) {
      console.log(`Database error: ${err}`);
    }
  });
  console.log(`RESULT: ${JSON.stringify(result)}`);
};

export const find = async (namespace, query) => {
  const params = [];

  for (const key in query) {
    params.push(`${key}="${query[key]}"`);
  }
  const predicate = params.join(" AND ");

  // TODO: Parameterize for security
  const sql = `SELECT * FROM ${namespace} WHERE ${predicate}`;
  console.log(`SQL is: ${sql}`);

  const db = await sqlite();

  const result = await db.get(sql, (err) => {
    if (err) {
      console.log(`Database error: ${err}`);
    }
  });

  return result;
};

export const all = async (namespace) => {
  const sql = `SELECT * FROM ${namespace}`;
  console.log(`sql: ${sql}`);

  const db = await sqlite();

  const result = await db.all(sql, (err) => {
    if (err) {
      console.log(`Database error: ${err}`);
    }
  });

  return result;
};

export const remove = async (key) => {};
