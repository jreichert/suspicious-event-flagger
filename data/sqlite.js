import sqlite3 from "sqlite3";
import { open } from "sqlite";

// you would have to import / invoke this in another file
export async function sqlite() {
  return open({
    filename: "event-flagger.db",
    driver: sqlite3.Database,
  });
}
