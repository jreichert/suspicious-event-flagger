import * as EventDAO from "./data/event.js";
import * as UserDAO from "./data/user.js";
import * as IpDAO from "./data/ip.js";
import * as CidrDAO from "./data/cidr.js";

export const processEvents = async (events) => {
  const badEvents = await badEvents(events);
  await EventDAO.store(badEvents);
};

// For a prod implementation, each event would be processed in its own async process
// rather than serially
const badEvents = async (events) => {
  const badEvents = [];

  for (const event of events) {
    console.log(`NEXT: ${JSON.stringify(event)}`);
    const userId = event.user_id;
    const ipv4 = event.ipv4;

    // TODO: if we are storing any info about the reason it was flagged,
    // keep these 3 checks separate.  If if not, combine into 1 stmt
    if (await UserDAO.contains(userId)) {
      badEvents.push(event);
    }

    if (IpDAO.contains(ipv4)) {
      badEvents.push(event);
    }

    if (CidrDAO.containsIp(ipv4)) {
      badEvents.push(event);
    }
  }

  return badEvents;
};
