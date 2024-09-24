import express from "express";
import { processEvents } from "./event_analyzer.js";
import * as EventDAO from "./data/event.js";
import * as CidrDAO from "./data/cidr.js";
import { processJSONL } from "./util/processJSONL.js";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Send a list of system events to the application for analysis.
 * "Bad" events will be stored for future analysis.  Events are considered bad
 * for one of three reasons:
 *
 * * It is is a known bad CIDR block
 * * It comes from a suspicious user
 * * It comes from a suspicious IP (may or may not be in a bad CIDR block)
 *
 * To process an indivual event, simply send it as a one-item array.
 * For scalability we only acknowledge receipt of the request; event processing
 * is handled async.
 */
app.put("/events", (req, res) => {
  const events = req.body;

  // This is intentionally handled async so the endpoint can be fire-and-forget
  processEvents(events);

  return res.status(200).json({ status: "success" });
});

// TODO: This would be implemented to mark an event as good when it had
// previously been marked as bad (i.e. our undo operation)
app.delete("/event", async (_req, _res) => {});

/**
 * Retrieve all events that have been marked as bad.
 * Note that in a prod environment we would provide capabilities
 * for filtering, summarization, and/or pagination (or possibly
 * use a job-based approach where the output was an async downloadable
 * file containing all entries requested).
 */
app.get("/events", async (req, res) => {
  const start = req.query.start;
  const end = req.query.end;
  const results = await EventDAO.getAll(start, end);

  return res.status(200).json(results);
});

/**
 * For testing only.  Loads events from the test file.
 * In real life this would *not* be a public method.  We
 * would instead have a proper test framework that would read from
 * the file instead.
 */
app.post("/ingest_events", (_req, res) => {
  processJSONL(
    "./misc/events.jsonl",
    40000,
    () => {},
    (bufferArray) => {
      processEvents(bufferArray);
      // console.log("---------");
      // console.log(`Processing buffer of ${bufferArray.length} items`);
      // console.dir(bufferArray);
    }
  );

  return res.status(200).json({ status: "success" });
});

app.put("/cidr", async (req, res) => {
  const json = req.body;
  await CidrDAO.store(json.cidr);

  return res.status(200).json({ status: "success" });
});

app.get("/cidrs", async (_req, res) => {
  const result = await CidrDAO.getAll();

  return res.status(200).json(result);
});

/**
 * Remove a CIDR block that has been marked bad.
 * If the CIDR block isn't in the set, this is a noop.
 */
app.delete("/cidr", async (req, res) => {
  const json = req.body;
  await CidrDAO.del(json.cidr);

  return res.status(200).json({ status: "success" });
});

// TODO: this would be implemented to mark a CIDR block as good, with the following:
// * if the CIDR block exists, delete it
// * if a subnet of the CIDR block exists, delete it if 'cascade' == true
// * if this CIDR block is part of a bigger network, split the portions around it
//   into multiple subnets
app.delete("/cidr", async (_req, _res) => {});

const server = app.listen(3000, () => {
  console.log(`API server listening on port 3000`);
});
