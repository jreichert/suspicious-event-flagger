import { sqlite } from "./sqlite.js";

export const insert = async (namespace, record) => {
  const rows = [];
  const values = [];

  for (const key in record) {
    rows.push(key);
    values.push(record[key]);
  }

  const sql = `INSERT OR IGNORE INTO  ${namespace} (${rows.join(
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

export const get = async (key) => {};

export const remove = async (key) => {};
