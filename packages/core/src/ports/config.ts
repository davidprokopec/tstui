import { Config, Context, Effect, Layer } from "effect";

export interface AppConfig {
  readonly server: string;
  readonly nickname: string;
}
export class ConfigPort extends Context.Service<ConfigPort, AppConfig>()(
  "@tstui/ConfigPort",
) {}
export const ConfigLive = Layer.effect(
  ConfigPort,
  Effect.gen(function* () {
    const server = yield* Config.String("TSTUI_SERVER").pipe(
      Config.withDefault("localhost"),
    );
    const nickname = yield* Config.String("TSTUI_NICKNAME").pipe(
      Config.withDefault("tstui-user"),
    );
    return ConfigPort.of({ server, nickname });
  }),
);
