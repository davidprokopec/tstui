import { Schema } from "effect";
import {
  CapabilityReport,
  AppFocus,
  Channel,
  ClientEntry,
  ConnectionPhase,
  Message,
  Server,
} from "./domain/model.js";

export const DomainEvent = Schema.Union([
  Schema.TaggedStruct("ConnectionChanged", {
    phase: ConnectionPhase,
    server: Schema.NullOr(Server),
  }),
  Schema.TaggedStruct("ChannelListUpdated", {
    channels: Schema.Array(Channel),
  }),
  Schema.TaggedStruct("ClientListUpdated", {
    clients: Schema.Array(ClientEntry),
  }),
  Schema.TaggedStruct("ClientMoved", {
    clientId: Schema.String,
    channelId: Schema.String,
  }),
  Schema.TaggedStruct("MessageReceived", { message: Message }),
  Schema.TaggedStruct("ChannelSelected", { channelId: Schema.String }),
  Schema.TaggedStruct("ChannelJoined", { channelId: Schema.String }),
  Schema.TaggedStruct("FocusChanged", { focus: AppFocus }),
  Schema.TaggedStruct("NicknameChanged", { nickname: Schema.String }),
  Schema.TaggedStruct("CapabilityChanged", { capabilities: CapabilityReport }),
  Schema.TaggedStruct("ErrorRaised", { message: Schema.String }),
]);
export type DomainEvent = typeof DomainEvent.Type;

export const decodeDomainEvent = Schema.decodeUnknownEffect(DomainEvent);
