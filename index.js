import express from "express";
import { status } from "./event_analyzer.js";
import * as EventDAO from "./data/event.js";
import * as CidrDAO from "./data/cidr.js";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Should take both an individual event, and a batch of events
app.put("/events", async (req, res) => {
  const events = req.body;
  const result = await status(events);

  // This is intentionally left as async so the endpoint can be fire-and-forget
  // EventDAO.store(events);

  return res.status(200).json(result);
});

// TODO: This would be implemented to mark an event as good when it had
// previouisly been marked as bad (i.e. our undo operation)
app.delete("/event", async (_req, _res) => {});

app.get("/events", async (_req, res) => {});

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
