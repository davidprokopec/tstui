import { Layer } from "effect";
import { FakeTeamSpeakLive } from "./adapters/fake/index.js";
import { HoneyBBQTeamSpeakLive } from "./adapters/honeybbq/index.js";
import { PersistenceFileLive } from "./adapters/persistence-file/index.js";
import { CommandLive } from "./commands/index.js";
import { PersistenceMemory } from "./ports/persistence.js";
import { EventBusLive, ProjectionLive } from "./state.js";

export const makeAppLayer = (demo: boolean) => {
  const infrastructure = Layer.merge(
    EventBusLive,
    demo ? PersistenceMemory : PersistenceFileLive,
  );
  const services = Layer.merge(
    ProjectionLive,
    demo ? FakeTeamSpeakLive : HoneyBBQTeamSpeakLive,
  ).pipe(Layer.provideMerge(infrastructure));
  return CommandLive.pipe(Layer.provideMerge(services));
};
