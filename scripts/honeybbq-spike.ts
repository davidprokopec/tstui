import {
  Client,
  ClientStatus,
  generateIdentity,
  identityFromString,
} from "@honeybbq/teamspeak-client";

const identity = generateIdentity(8);
const restored = identityFromString(identity.toString());
if (restored.publicKeyBase64() !== identity.publicKeyBase64())
  throw new Error("HoneyBBQ identity roundtrip failed");
const client = new Client(restored, "127.0.0.1", "tstui-spike");
if (client.status !== ClientStatus.Disconnected)
  throw new Error("HoneyBBQ client did not initialize as disconnected");
console.log(
  `HoneyBBQ identity roundtrip and disconnected client initialization passed on Bun ${Bun.version}; no network connection attempted.`,
);
