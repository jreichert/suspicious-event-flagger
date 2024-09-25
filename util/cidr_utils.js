import ip from "ip";
import cidrMatcher from "cidr-matcher";

export const isValidCidr = (cidr) => {
  if (!cidr) return false;

  const cidrPattern =
    "^([0-9]{1,3}.){3}[0-9]{1,3}(/([0-9]|[1-2][0-9]|3[0-2]))$";
  return cidr.match(cidrPattern) != null;
};

export const lowestIpFor = (cidr) => {
  console.log(`lowestIpFor: ${cidr}`);
  const cidrParts = cidr.split("/");
  return ip.toLong(cidrParts[0]);
};
