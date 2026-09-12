import { Schema } from "effect";

export class ConnectionError extends Schema.TaggedError<ConnectionError>()(
  "ConnectionError",
  {
    message: Schema.String,
    transient: Schema.Boolean,
  },
) {}

export class CommandError extends Schema.TaggedError<CommandError>()(
  "CommandError",
  {
    message: Schema.String,
  },
) {}

export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "PersistenceError",
  {
    message: Schema.String,
  },
) {}
