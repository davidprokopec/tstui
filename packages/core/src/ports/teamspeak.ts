import { Context, Effect } from "effect";
import type { CommandError, ConnectionError } from "../domain/errors.js";

export interface ConnectOptions {
  readonly server: string;
  readonly nickname: string;
}
export interface TeamSpeakPortShape {
  readonly connect: (
    options: ConnectOptions,
  ) => Effect.Effect<void, ConnectionError>;
  readonly disconnect: Effect.Effect<void>;
  readonly joinChannel: (
    channelId: string,
  ) => Effect.Effect<void, CommandError>;
  readonly sendMessage: (
    targetId: string,
    body: string,
  ) => Effect.Effect<void, CommandError>;
  readonly setNickname: (nickname: string) => Effect.Effect<void, CommandError>;
}
export class TeamSpeakPort extends Context.Service<
  TeamSpeakPort,
  TeamSpeakPortShape
>()("@tstui/TeamSpeakPort") {}
