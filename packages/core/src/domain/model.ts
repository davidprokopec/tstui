import { Schema } from "effect";

export const ConnectionPhase = Schema.Literals([
  "disconnected",
  "connecting",
  "connected",
  "reconnecting",
]);
export type ConnectionPhase = typeof ConnectionPhase.Type;

export const Server = Schema.Struct({ id: Schema.String, name: Schema.String });
export interface Server extends Schema.Schema.Type<typeof Server> {}

export const Channel = Schema.Struct({
  id: Schema.String,
  parentId: Schema.String,
  name: Schema.String,
});
export interface Channel extends Schema.Schema.Type<typeof Channel> {}

export const ClientEntry = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  nickname: Schema.String,
});
export interface ClientEntry extends Schema.Schema.Type<typeof ClientEntry> {}

export const Message = Schema.Struct({
  id: Schema.String,
  targetId: Schema.String,
  sender: Schema.String,
  body: Schema.String,
  timestamp: Schema.Number,
});
export interface Message extends Schema.Schema.Type<typeof Message> {}

export const CapabilityReport = Schema.Struct({
  text: Schema.Literal("available"),
  voice: Schema.Literal("unavailable"),
  files: Schema.Literal("unavailable"),
  transport: Schema.Literals(["fake", "honeybbq"]),
});
export interface CapabilityReport extends Schema.Schema.Type<
  typeof CapabilityReport
> {}

export interface AppState {
  readonly phase: ConnectionPhase;
  readonly server: Server | null;
  readonly channels: ReadonlyArray<Channel>;
  readonly clients: ReadonlyArray<ClientEntry>;
  readonly activeChannelId: string | null;
  readonly messages: Readonly<Record<string, ReadonlyArray<Message>>>;
  readonly nickname: string;
  readonly capabilities: CapabilityReport;
  readonly error: string | null;
}

export const initialState: AppState = {
  phase: "disconnected",
  server: null,
  channels: [],
  clients: [],
  activeChannelId: null,
  messages: {},
  nickname: "tstui-user",
  capabilities: {
    text: "available",
    voice: "unavailable",
    files: "unavailable",
    transport: "fake",
  },
  error: null,
};
