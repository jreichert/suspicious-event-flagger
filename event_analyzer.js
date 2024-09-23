import * as EventDAO from "./data/event.js";
import * as UserDAO from "./data/user.js";
import * as IpDAO from "./data/ip.js";
import * as CidrDAO from "./data/cidr.js";

export const processEvents = async (events) => {
  const badEvents = await filterEvents(events);

  // Get all unique users & ips in this set of events
  const badUsers = [...new Set(badEvents.map((x) => x.user_id))];
  const badIPs = [...new Set(badEvents.map((x) => x.ipv4))];

  // Add them to the respective sets
  await UserDAO.store(badUsers);
  await IpDAO.store(badIPs);
  await EventDAO.store(badEvents);
};

// For a prod implementation, each event would be processed in its own async process
// rather than serially
const filterEvents = async (events) => {
  // List of events may be large so process each in its own thread
  const badEvents = await Promise.all(
    events.map(async (event) => {
      const userId = event.user_id;
      const ipv4 = event.ipv4;

      if (await UserDAO.contains(userId)) {
        return event;
      }

      if (await IpDAO.contains(ipv4)) {
        return event;
      }

      const match = await CidrDAO.containsIp(ipv4);
      if (match) {
        console.log(`Match found for ip ${ipv4}: ${match}`);
        return event;
      }
    })
  );

  return badEvents;
};
