import {
  generateIdentity,
  identityFromString,
} from "@honeybbq/teamspeak-client";

const identity = generateIdentity(8);
const restored = identityFromString(identity.toString());
if (restored.publicKeyBase64() !== identity.publicKeyBase64())
  throw new Error("HoneyBBQ identity roundtrip failed");
console.log(
  `HoneyBBQ identity roundtrip passed on Bun ${Bun.version}; no network connection attempted.`,
);
