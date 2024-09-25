import * as EventDAO from "./data/event.js";
import * as UserDAO from "./data/user.js";
import * as IpDAO from "./data/ip.js";
import * as CidrDAO from "./data/cidr.js";

/*
 * Examine a list of events and store suspicious ones for later analysis.
 * If an event is suspicious then we add the root cause to the event, store it,
 * and also store the event's user and ip in their respective suspicious lists.
 *
 * @param {Array} events The list of events to process
 */
export const processEvents = async (events) => {
  const badEvents = await filterEvents(events);

  if (badEvents.length > 0) {
    // Get all unique users & ips in this set of events
    const badUsers = [...new Set(badEvents.map((x) => x.username))];
    const badIPs = [...new Set(badEvents.map((x) => x.source_ip))];
    console.log("Bad Users:");
    console.dir(badUsers);
    console.log("Bad IPs");
    console.dir(badIPs);

    // Add them to the respective sets
    await UserDAO.store(badUsers);
    await IpDAO.store(badIPs);
    await EventDAO.store(badEvents);
  }
};

/**
 * Filter a list of events by determining which ones are suspicious.
 *
 * Events are considered suspicious for one of three reasons:
 *
 * * It is is a known suspicious CIDR block
 * * It comes from a suspicious user
 * * It comes from a suspicious IP (may or may not be in a suspicious CIDR block)
 *
 * @param {Array} events The list of events to process
 *
 */
const filterEvents = async (events) => {
  // List of events may be large so process each in its own thread
  const badEvents = await Promise.all(
    events.map(async (event) => {
      const userId = event.username;
      const ipv4 = event.source_ip;

      if (await UserDAO.contains(userId)) {
        console.log(`Matched on user ${userId}`);
        event.root_cause = `user ${userId}`;
        // console.dir(event);
        return event;
      }

      if (await IpDAO.contains(ipv4)) {
        console.log(`Matched on ipv4 ${ipv4}`);
        event.root_cause = `Matched on ipv4 ${ipv4}`;
        // console.dir(event);
        return event;
      }

      const match = await CidrDAO.containsIp(ipv4);
      if (match) {
        console.log(`Matched on CIDR with ip ${ipv4}`);
        event.root_cause = `Matched on CIDR ${match}`;
        // console.dir(event);
        return event;
      }
    })
  ).then((values) => values.filter((v) => v));

  return badEvents;
};
