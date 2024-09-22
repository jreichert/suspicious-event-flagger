import * as UserDAO from "./data/user.js";
import * as IpDAO from "./data/ip.js";
import * as EventDAO from "./data/event.js";

// For a prod implementation, each event would be processed in its own async process
// rather than serially

export const status = async (events) => {
  const badEvents = [];

  for (const event of events) {
    // console.log(`NEXT: ${JSON.stringify(event)}`);
    const id = event.user_id;
    const badUser = await UserDAO.find({ id });

    if (badUser) {
      badEvents.push(event);
    }

    const ipv4 = event.ipv4;
    const badIP = await IpDAO.find({ ipv4 });

    if (badIP) {
      badEvents.push(event);
    }
  }

  return results;
};
