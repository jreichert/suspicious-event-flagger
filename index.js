import express from "express";
import { processEvents } from "./event_analyzer.js";
import * as EventDAO from "./data/event.js";
import * as CidrDAO from "./data/cidr.js";
import * as EventAnalyzer from "./event_analyzer.js";

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
app.put("/events", async (req, res) => {
  const events = req.body;

  // This is intentionally left as async so the endpoint can be fire-and-forget
  const result = processEvents(events);

  return res.status(200).json(result);
});

// TODO: This would be implemented to mark an event as good when it had
// previouisly been marked as bad (i.e. our undo operation)
app.delete("/event", async (_req, _res) => {});

/**
 * Retrieve all events that have been marked as bad.
 * Note that in a prod environment we would provide capabilities
 * for filtering, summarization, and/or pagination.
 */
app.get("/events", async (_req, res) => {
    EventDAO.
});

app.put("/cidr", async (req, res) => {
  const cidr = req.body;
  await CidrDAO.store(cidr);

  return res.status(200).json({ status: "success" });
});

app.get("/cidrs", async (req, res) => {
  const result = await CidrDAO.all();

  return res.status(200).json(result);
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
