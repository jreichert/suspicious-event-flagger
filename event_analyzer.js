import * as EventDAO from "./data/event.js";
import * as UserDAO from "./data/user.js";
import * as IpDAO from "./data/ip.js";
import * as CidrDAO from "./data/cidr.js";

export const processEvents = async (events) => {
  // A design decision that was made here was to determine if any events
  // in a batch are bad at the start of the method, and we only persist
  // the associated users & ips with those events *after* we make that
  // determination.  While this speeds up processing time, it also has the effect
  // that if any of the events in a given batch are only bad because
  // previous events *in that same batch* were bad, they may get overlooked.
  //
  // Ideally the write API would be fronted by a message queue that could
  // submit events more or less one at a time across multiple app servers.
  // This could still result in out of order events, but far fewer of them.
  const badEvents = await filterEvents(events);
  console.dir(badEvents);

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
